import { NextResponse } from "next/server";
import { requireAdminForApi } from "@/lib/admin-auth";
import type { StockItemRow } from "@/lib/supabase/types";
import { normalizeStockItem } from "@/lib/stock";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await requireAdminForApi();
  if (!admin.ok) return admin.response;

  const { data, error } = await admin.supabase.from("stock_items").select("*").order("expiry_date", { ascending: true });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const items = ((data ?? []) as StockItemRow[])
    .map((row) => normalizeStockItem(row))
    .filter((item) => item.computed_status === "expiringSoon");

  return NextResponse.json({ ok: true, items });
}
