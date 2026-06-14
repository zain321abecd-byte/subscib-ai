import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { StockItemRow } from "@/lib/supabase/types";
import { daysLeft, normalizeStockItem, STOCK_STATUS_LABELS } from "@/lib/stock";
import { sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

function sameUtcDate(a: string | null, b: Date) {
  if (!a) return false;
  const d = new Date(a);
  return d.getUTCFullYear() === b.getUTCFullYear()
    && d.getUTCMonth() === b.getUTCMonth()
    && d.getUTCDate() === b.getUTCDate();
}

function reminderEmail(item: StockItemRow, left: number, expired: boolean) {
  const expiryDate = new Intl.DateTimeFormat("en-PK", { dateStyle: "medium" }).format(new Date(`${item.expiry_date}T00:00:00`));
  const subject = expired ? `Urgent Stock Expired: ${item.item_name}` : `Stock Expiry Reminder: ${item.item_name}`;
  const message = expired
    ? "This stock item has expired. Please replace or renew it immediately."
    : "Please renew or replace this stock soon before it reaches expiry.";
  const text = [
    message,
    "",
    `Item name: ${item.item_name}`,
    `Quantity: ${Number(item.quantity).toLocaleString("en-PK")} ${item.unit ?? ""}`.trim(),
    `Expiry date: ${expiryDate}`,
    `Days remaining: ${left}`,
    `Status: ${STOCK_STATUS_LABELS[normalizeStockItem(item).computed_status]}`,
  ].join("\n");

  return {
    subject,
    text,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
        <p>${message}</p>
        <ul>
          <li><strong>Item name:</strong> ${item.item_name}</li>
          <li><strong>Quantity:</strong> ${Number(item.quantity).toLocaleString("en-PK")} ${item.unit ?? ""}</li>
          <li><strong>Expiry date:</strong> ${expiryDate}</li>
          <li><strong>Days remaining:</strong> ${left}</li>
        </ul>
      </div>
    `,
  };
}

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ ok: false, error: "CRON_SECRET is not configured." }, { status: 503 });
  }
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date();
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("stock_items")
    .select("*")
    .neq("status", "renewed")
    .order("expiry_date", { ascending: true });

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const items = (data ?? []) as StockItemRow[];
  const results: Array<{ id: string; itemName: string; sent: boolean; type?: string; error?: string }> = [];

  for (const item of items) {
    const left = daysLeft(item.expiry_date, today);
    const expired = left < 0;
    const dueSoon = left >= 0 && left <= item.reminder_days_before_expiry;
    const nextStatus = expired ? "expired" : dueSoon ? "expiringSoon" : "active";

    if (nextStatus !== item.status) {
      await supabase.from("stock_items").update({ status: nextStatus }).eq("id", item.id);
    }

    if (!expired && !dueSoon) continue;

    const reminderField = expired ? "last_expired_reminder_sent_at" : "last_reminder_sent_at";
    const lastSent = expired ? item.last_expired_reminder_sent_at : item.last_reminder_sent_at;
    if (sameUtcDate(lastSent, today)) continue;

    try {
      const email = reminderEmail({ ...item, status: nextStatus }, left, expired);
      await sendEmail({
        to: item.contact_email,
        subject: email.subject,
        text: email.text,
        html: email.html,
      });
      await supabase.from("stock_items").update({ [reminderField]: today.toISOString(), status: nextStatus }).eq("id", item.id);
      results.push({ id: item.id, itemName: item.item_name, sent: true, type: expired ? "expired" : "expiringSoon" });
    } catch (err) {
      results.push({
        id: item.id,
        itemName: item.item_name,
        sent: false,
        type: expired ? "expired" : "expiringSoon",
        error: err instanceof Error ? err.message : "Email failed",
      });
    }
  }

  return NextResponse.json({ ok: true, checked: items.length, reminders: results });
}
