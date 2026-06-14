import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type ItemInput = {
  id: string;
  name: string;
  qty: number;
  price: number;
  variation?: {
    plan?: string;
    accountType?: string;
    accountLabel?: string;
    duration?: string;
    summary?: string;
  };
};

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

  // Item `price` is the PKR amount stored in products at the time of adding
  // to cart (canonical since 2026-05). subtotal_pkr is the source of truth;
  // subtotal_usd is what the foreign gateway charges and is provided by the
  // client (computed against the live FX rate).
  const subtotalPkr = items.reduce((s, i) => s + Number(i.price) * Number(i.qty || 1), 0);
  const subtotalUsd =
    typeof body.subtotal_usd === "number" && body.subtotal_usd > 0
      ? body.subtotal_usd
      : null;

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

  const cleanStr = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 500) : null);

  // Resolve the calling customer's user_id from their auth cookie. We don't
  // trust whatever user_id the client puts in the body — only the session.
  // (If unauthenticated, user_id stays null and the order is anonymous.)
  let userId: string | null = null;
  try {
    const ssr = await getSupabaseServer();
    const { data: { user } } = await ssr.auth.getUser();
    if (user) userId = user.id;
  } catch {
    // ignore — proceed with null
  }

  const { data, error } = await supabase
    .from("orders")
    .insert({
      order_number,
      user_id: userId,
      customer_email: String(body.customer_email).trim().toLowerCase(),
      customer_phone: typeof body.customer_phone === "string" ? body.customer_phone.trim() : null,
      customer_name: typeof body.customer_name === "string" ? body.customer_name.trim() : null,
      items,
      subtotal_usd: subtotalUsd != null ? subtotalUsd.toFixed(2) : null,
      subtotal_pkr: typeof body.subtotal_pkr === "number" ? body.subtotal_pkr : subtotalPkr,
      status: "pending",
      payment_method: typeof body.payment_method === "string" ? body.payment_method : null,
      transaction_id: typeof body.transaction_id === "string" ? body.transaction_id : null,
      utm_source: cleanStr(body.utm_source),
      utm_medium: cleanStr(body.utm_medium),
      utm_campaign: cleanStr(body.utm_campaign),
      referrer: cleanStr(body.referrer),
      landing_page: cleanStr(body.landing_page),
      package_tier: cleanStr(body.package_tier),
    })
    .select("id, order_number")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message, stored: false }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data.id, order_number: data.order_number, stored: true });
}
