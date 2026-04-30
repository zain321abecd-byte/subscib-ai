import { NextResponse } from "next/server";
import {
  PROVIDERS,
  friendlyGatewayMessage,
  gatewayFetch,
  getConfig,
  makeUrl,
  normalizePaymentStatus,
  normalizeProvider,
} from "@/lib/sahulatpay";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const config = getConfig();
  if (config.missing.length) {
    return NextResponse.json(
      { success: false, message: "SahulatPay is not configured on the server.", missing: config.missing },
      { status: 500 },
    );
  }

  const url = new URL(req.url);
  const provider = normalizeProvider(url.searchParams.get("provider"));
  const orderId = String(url.searchParams.get("orderId") || "").trim();
  const transactionId = String(url.searchParams.get("transactionId") || orderId).trim();

  if (!provider) return NextResponse.json({ success: false, message: "Provider is required." }, { status: 400 });
  if (!orderId && !transactionId) return NextResponse.json({ success: false, message: "Order ID or transaction ID is required." }, { status: 400 });

  const providerConfig = PROVIDERS[provider as Exclude<ReturnType<typeof normalizeProvider>, "">];
  const endpoint = makeUrl(config.baseUrl, providerConfig.statusPath, config.merchantId);
  const apiKeyHeader = { "x-api-key": config.apiKey };
  let result: { status: number; payload: any };

  try {
    if (provider === "jazzcash") {
      result = await gatewayFetch(endpoint, {
        method: "POST",
        headers: { ...apiKeyHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId }),
      });
    } else {
      const statusUrl = new URL(endpoint);
      const queryKey = provider === "easypaisa" ? "orderId" : "transactionId";
      statusUrl.searchParams.set(queryKey, queryKey === "orderId" ? orderId || transactionId : transactionId || orderId);
      result = await gatewayFetch(statusUrl.toString(), { method: "GET", headers: apiKeyHeader });
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: "Could not connect to SahulatPay.", details: error.message },
      { status: 502 },
    );
  }

  const { status: gatewayHttpStatus, payload: gatewayPayload } = result;
  const httpOk = gatewayHttpStatus >= 200 && gatewayHttpStatus < 300;
  const gatewaySaidOk = gatewayPayload?.success !== false;
  const statusText =
    gatewayPayload?.data?.transactionStatus ||
    gatewayPayload?.data?.responseDesc ||
    gatewayPayload?.message ||
    gatewayPayload?.statusText;
  const paymentStatus = normalizePaymentStatus(statusText);
  const callSucceeded = httpOk && gatewaySaidOk;

  return NextResponse.json(
    {
      success: callSucceeded,
      provider,
      providerLabel: providerConfig.label,
      orderId: gatewayPayload?.data?.orderId || orderId || transactionId,
      transactionId,
      paymentStatus,
      gatewayHttpStatus,
      message: callSucceeded ? "Payment status retrieved." : friendlyGatewayMessage(gatewayPayload, "Could not retrieve payment status."),
      gatewayResponse: gatewayPayload,
    },
    { status: callSucceeded ? 200 : Math.max(400, Math.min(gatewayHttpStatus || 502, 599)) },
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: { "Cache-Control": "no-store", "Access-Control-Allow-Methods": "GET,OPTIONS" },
  });
}
