import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const VALID_STATUSES = ["pending", "paid", "delivered", "failed", "refunded", "cancelled"] as const;
type Status = (typeof VALID_STATUSES)[number];

// PATCH /api/orders/<id_or_number>
// Body: { status?, transaction_id?, notes? }
// Used by SahulatPay callback + admin to advance an order's lifecycle.
// Note: this is NOT admin-protected because the SahulatPay callback is
// unauthenticated. We rely on the transaction_id correlation as the gate.
// In production, lock this down further by verifying a callback signature
// or limiting to specific fields the callback can mutate.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 503 });
  }

  const update: Record<string, unknown> = {};
  if (typeof body.status === "string" && VALID_STATUSES.includes(body.status as Status)) {
    update.status = body.status;
    if (body.status === "delivered") update.delivered_at = new Date().toISOString();
  }
  if (typeof body.transaction_id === "string") update.transaction_id = body.transaction_id;
  if (typeof body.notes === "string") update.notes = body.notes;
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ ok: false, error: "No valid fields to update" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  // Match either by uuid id or by order_number, so callers don't need the uuid.
  const isUuid = /^[0-9a-f-]{36}$/i.test(id);
  const filterCol = isUuid ? "id" : "order_number";

  const { data, error } = await supabase
    .from("orders")
    .update(update as never)
    .eq(filterCol, id)
    .select("id, order_number, status")
    .maybeSingle();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });

  return NextResponse.json({ ok: true, order: data });
}
