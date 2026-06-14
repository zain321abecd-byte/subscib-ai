import { NextResponse } from "next/server";
import { requireAdminForApi } from "@/lib/admin-auth";
import type { StockItemRow } from "@/lib/supabase/types";
import { normalizeStockItem, toStockInsert, validateStockInput } from "@/lib/stock";

export const dynamic = "force-dynamic";

function bodyToInput(body: any) {
  const quantity = Number(body?.quantity);
  const reminderDaysBeforeExpiry = Number(body?.reminderDaysBeforeExpiry ?? body?.reminder_days_before_expiry ?? 7);
  return {
    item_name: String(body?.itemName ?? body?.item_name ?? "").trim(),
    category: body?.category ? String(body.category).trim() : null,
    quantity,
    unit: body?.unit ? String(body.unit).trim() : null,
    expiry_date: String(body?.expiryDate ?? body?.expiry_date ?? "").trim(),
    reminder_days_before_expiry: Number.isFinite(reminderDaysBeforeExpiry) ? Math.max(0, Math.floor(reminderDaysBeforeExpiry)) : 7,
    contact_email: String(body?.contactEmail ?? body?.contact_email ?? "").trim().toLowerCase(),
    supplier_name: body?.supplierName || body?.supplier_name ? String(body?.supplierName ?? body?.supplier_name).trim() : null,
    status: "active" as const,
    notes: body?.notes ? String(body.notes).trim() : null,
  };
}

export async function GET() {
  const admin = await requireAdminForApi();
  if (!admin.ok) return admin.response;

  const { data, error } = await admin.supabase.from("stock_items").select("*").order("expiry_date", { ascending: true });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, items: ((data ?? []) as StockItemRow[]).map((row) => normalizeStockItem(row)) });
}

export async function POST(req: Request) {
  const admin = await requireAdminForApi();
  if (!admin.ok) return admin.response;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const input = bodyToInput(body);
  const validationError = validateStockInput(input);
  if (validationError) return NextResponse.json({ ok: false, error: validationError }, { status: 400 });

  const { data, error } = await admin.supabase.from("stock_items").insert(toStockInsert(input)).select("*").single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, item: normalizeStockItem(data as StockItemRow) }, { status: 201 });
}
