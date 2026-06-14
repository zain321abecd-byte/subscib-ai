import { NextResponse } from "next/server";
import { requireAdminForApi } from "@/lib/admin-auth";
import type { StockItemRow } from "@/lib/supabase/types";
import { normalizeStockItem, stockMutationStatus } from "@/lib/stock";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminForApi();
  if (!admin.ok) return admin.response;

  const { id } = await params;
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const expiryDate = String(body?.expiryDate ?? body?.expiry_date ?? "").trim();
  const quantity = body?.quantity === undefined || body?.quantity === "" ? null : Number(body.quantity);
  const reminderDaysBeforeExpiry = Number(body?.reminderDaysBeforeExpiry ?? body?.reminder_days_before_expiry ?? 7);

  if (!expiryDate) return NextResponse.json({ ok: false, error: "New expiry date is required." }, { status: 400 });
  if (quantity !== null && (!Number.isFinite(quantity) || quantity <= 0)) {
    return NextResponse.json({ ok: false, error: "Quantity must be a positive number." }, { status: 400 });
  }

  const reminder = Number.isFinite(reminderDaysBeforeExpiry) ? Math.max(0, Math.floor(reminderDaysBeforeExpiry)) : 7;
  const patch: Record<string, unknown> = {
    expiry_date: expiryDate,
    reminder_days_before_expiry: reminder,
    status: stockMutationStatus(expiryDate, reminder),
    renewed_at: new Date().toISOString(),
    last_reminder_sent_at: null,
    last_expired_reminder_sent_at: null,
  };
  if (quantity !== null) patch.quantity = quantity;

  const { data, error } = await admin.supabase.from("stock_items").update(patch).eq("id", id).select("*").single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, item: normalizeStockItem(data as StockItemRow) });
}
