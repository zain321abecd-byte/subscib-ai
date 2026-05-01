import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type ItemInput = { id: string; name: string; qty: number; price: number };

function shortOrderNumber(): string {
  // 8-char alphanumeric, prefixed with the year-month — easy to read in WhatsApp.
  const y = new Date();
  const ym = `${y.getUTCFullYear().toString().slice(2)}${String(y.getUTCMonth() + 1).padStart(2, "0")}`;
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `SAI-${ym}-${rand}`;
}

function isValidEmail(s: unknown): s is string {
  return typeof s === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const items: ItemInput[] = Array.isArray(body?.items) ? body.items : [];
  if (items.length === 0) {
    return NextResponse.json({ ok: false, error: "No items" }, { status: 400 });
  }
  if (!isValidEmail(body?.customer_email)) {
    return NextResponse.json({ ok: false, error: "Invalid email" }, { status: 400 });
  }

  const subtotalUsd = items.reduce((s, i) => s + Number(i.price) * Number(i.qty || 1), 0);

  // If Supabase isn't configured, no-op gracefully — checkout still works.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({
      ok: true,
      order_number: shortOrderNumber(),
      id: null,
      stored: false,
      reason: "supabase_not_configured",
    });
  }

  const supabase = getSupabaseAdmin();
  const order_number = shortOrderNumber();

  const { data, error } = await supabase
    .from("orders")
    .insert({
      order_number,
      customer_email: String(body.customer_email).trim().toLowerCase(),
      customer_phone: typeof body.customer_phone === "string" ? body.customer_phone.trim() : null,
      customer_name: typeof body.customer_name === "string" ? body.customer_name.trim() : null,
      items,
      subtotal_usd: subtotalUsd.toFixed(2),
      subtotal_pkr: typeof body.subtotal_pkr === "number" ? body.subtotal_pkr : null,
      status: "pending",
      payment_method: typeof body.payment_method === "string" ? body.payment_method : null,
      transaction_id: typeof body.transaction_id === "string" ? body.transaction_id : null,
    })
    .select("id, order_number")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message, stored: false }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data.id, order_number: data.order_number, stored: true });
}
