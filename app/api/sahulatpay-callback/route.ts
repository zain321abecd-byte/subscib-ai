import { NextResponse } from "next/server";
import { normalizePaymentStatus } from "@/lib/sahulatpay";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// SECURITY: This endpoint accepts inbound callbacks at face value. Before
// treating a callback as authoritative (e.g. fulfilling an order), re-verify
// by hitting /api/payment-status against SahulatPay using the order_id.

async function syncOrderStatus(transactionId: string, paymentStatus: string) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  if (!transactionId) return;
  // Map gateway payment_status to our order.status enum.
  const status =
    paymentStatus === "paid" ? "paid" :
    paymentStatus === "failed" ? "failed" :
    paymentStatus === "pending" ? "pending" : null;
  if (!status) return;
  try {
    await getSupabaseAdmin()
      .from("orders")
      .update({ status })
      .eq("transaction_id", transactionId);
  } catch (e) {
    console.error("[sahulatpay-callback] order status sync failed", e);
  }
}

async function handle(payload: Record<string, any>, method: string) {
  const orderId = String(payload.order_id || payload.orderId || payload.transactionId || "").trim();
  const rawStatus = payload.status || payload.transactionStatus || payload.responseDesc || "";
  const paymentStatus = normalizePaymentStatus(rawStatus);

  console.info("SahulatPay callback received", {
    method,
    orderId,
    paymentStatus,
    rawStatus: String(rawStatus).slice(0, 80),
  });

  await syncOrderStatus(orderId, paymentStatus);

  return NextResponse.json({
    received: true,
    message: "SahulatPay callback received.",
    orderId,
    paymentStatus,
    callback: {
      amount: payload.amount,
      msisdn: payload.msisdn,
      time: payload.time,
      order_id: payload.order_id,
      status: payload.status,
      type: payload.type,
    },
  });
}

export async function POST(req: Request) {
  // POST is the server-to-server notification path from SahulatPay. Always
  // return JSON so the gateway can parse our ack.
  let payload: Record<string, any> = {};
  try {
    payload = await req.json();
  } catch (error: any) {
    return NextResponse.json({ received: false, message: error.message }, { status: 400 });
  }
  return handle(payload, "POST");
}

export async function GET(req: Request) {
  // GET is almost always the BROWSER redirect-back after the customer
  // finishes the hosted card payment on SahulatPay. We still record the
  // status in our DB (best-effort), but the response must be a real HTML
  // redirect — not raw JSON — or the user sees a JSON blob and panics.
  // Server-to-server probes that explicitly ask for JSON keep getting JSON.
  const payload: Record<string, any> = {};
  const url = new URL(req.url);
  url.searchParams.forEach((value, key) => { payload[key] = value; });

  const orderId = String(payload.order_id || payload.orderId || payload.transactionId || "").trim();
  const rawStatus = payload.status || payload.transactionStatus || payload.responseDesc || "";
  const paymentStatus = normalizePaymentStatus(rawStatus);

  console.info("SahulatPay callback received", {
    method: "GET",
    orderId,
    paymentStatus,
    rawStatus: String(rawStatus).slice(0, 80),
  });

  // Best-effort DB sync — don't block the redirect on it.
  await syncOrderStatus(orderId, paymentStatus);

  const accept = req.headers.get("accept") || "";
  const wantsJson = accept.includes("application/json") && !accept.includes("text/html");
  if (wantsJson) return handle(payload, "GET");

  // Send the customer to the thank-you page with the order context so the
  // page can show the right success / failed / pending UI.
  const dest = new URL("/thank-you", url.origin);
  if (orderId) dest.searchParams.set("orderId", orderId);
  if (paymentStatus) dest.searchParams.set("status", paymentStatus);
  return NextResponse.redirect(dest, 303);
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: { "Cache-Control": "no-store", "Access-Control-Allow-Methods": "GET,POST,OPTIONS" },
  });
}
