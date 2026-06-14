import { NextResponse } from "next/server";
import { requireAdminForApi } from "@/lib/admin-auth";
import type { StockItemRow } from "@/lib/supabase/types";
import { normalizeStockItem, toStockInsert, validateStockInput } from "@/lib/stock";

export const dynamic = "force-dynamic";

function bodyToInput(body: any, existing?: StockItemRow) {
  const quantity = Number(body?.quantity ?? existing?.quantity);
  const reminderDaysBeforeExpiry = Number(body?.reminderDaysBeforeExpiry ?? body?.reminder_days_before_expiry ?? existing?.reminder_days_before_expiry ?? 7);
  return {
    item_name: String(body?.itemName ?? body?.item_name ?? existing?.item_name ?? "").trim(),
    category: body?.category !== undefined ? String(body.category || "").trim() || null : existing?.category ?? null,
    quantity,
    unit: body?.unit !== undefined ? String(body.unit || "").trim() || null : existing?.unit ?? null,
    expiry_date: String(body?.expiryDate ?? body?.expiry_date ?? existing?.expiry_date ?? "").trim(),
    reminder_days_before_expiry: Number.isFinite(reminderDaysBeforeExpiry) ? Math.max(0, Math.floor(reminderDaysBeforeExpiry)) : 7,
    contact_email: String(body?.contactEmail ?? body?.contact_email ?? existing?.contact_email ?? "").trim().toLowerCase(),
    supplier_name: body?.supplierName !== undefined || body?.supplier_name !== undefined
      ? String(body?.supplierName ?? body?.supplier_name ?? "").trim() || null
      : existing?.supplier_name ?? null,
    status: "active" as const,
    notes: body?.notes !== undefined ? String(body.notes || "").trim() || null : existing?.notes ?? null,
  };
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminForApi();
  if (!admin.ok) return admin.response;

  const { id } = await params;
  const { data, error } = await admin.supabase.from("stock_items").select("*").eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ ok: false, error: "Stock item not found" }, { status: 404 });

  return NextResponse.json({ ok: true, item: normalizeStockItem(data as StockItemRow) });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminForApi();
  if (!admin.ok) return admin.response;

  const { id } = await params;
  const { data: existing, error: readError } = await admin.supabase.from("stock_items").select("*").eq("id", id).maybeSingle();
  if (readError) return NextResponse.json({ ok: false, error: readError.message }, { status: 500 });
  if (!existing) return NextResponse.json({ ok: false, error: "Stock item not found" }, { status: 404 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const input = bodyToInput(body, existing as StockItemRow);
  const validationError = validateStockInput(input);
  if (validationError) return NextResponse.json({ ok: false, error: validationError }, { status: 400 });

  const { data, error } = await admin.supabase.from("stock_items").update(toStockInsert(input)).eq("id", id).select("*").single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, item: normalizeStockItem(data as StockItemRow) });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminForApi();
  if (!admin.ok) return admin.response;

  const { id } = await params;
  const { error } = await admin.supabase.from("stock_items").delete().eq("id", id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
