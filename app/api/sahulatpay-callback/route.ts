import { NextResponse } from "next/server";
import { normalizePaymentStatus } from "@/lib/sahulatpay";

export const dynamic = "force-dynamic";

// SECURITY: This endpoint accepts inbound callbacks at face value. Before
// treating a callback as authoritative (e.g. fulfilling an order), re-verify
// by hitting /api/payment-status against SahulatPay using the order_id.

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
  let payload: Record<string, any> = {};
  try {
    payload = await req.json();
  } catch (error: any) {
    return NextResponse.json({ received: false, message: error.message }, { status: 400 });
  }
  return handle(payload, "POST");
}

export async function GET(req: Request) {
  const payload: Record<string, any> = {};
  const url = new URL(req.url);
  url.searchParams.forEach((value, key) => { payload[key] = value; });
  return handle(payload, "GET");
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: { "Cache-Control": "no-store", "Access-Control-Allow-Methods": "GET,POST,OPTIONS" },
  });
}
