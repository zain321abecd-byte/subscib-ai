import { NextResponse } from "next/server";
import {
  PROVIDERS,
  buildEncryptedRequestBody,
  friendlyGatewayMessage,
  gatewayFetch,
  getConfig,
  getProviderMode,
  isPublicHttpUrl,
  makeUrl,
  normalizeAmount,
  normalizeAmountNumber,
  normalizeProvider,
  validateWalletPhone,
} from "@/lib/sahulatpay";

export const dynamic = "force-dynamic";

function maskPhone(phone: string): string {
  return String(phone || "").replace(/^(\d{4})\d+(\d{2})$/, "$1*****$2");
}

function gatewayCode(payload: any, status: number): number {
  return Number(payload?.statusCode || payload?.data?.statusCode || status);
}

function gatewayHostedUrl(payload: any): string {
  const raw = payload?.data?.completeLink || payload?.data?.complete_link || payload?.completeLink || "";
  if (!raw) return "";
  const overrideHost = (process.env.SAHULATPAY_HOSTED_HOST || "merchant.assanpay.com").trim();
  try {
    const url = new URL(raw);
    if (url.hostname === "merchant.sahulatpay.com") url.hostname = overrideHost;
    return url.toString();
  } catch {
    return raw;
  }
}

function gatewayTransactionId(payload: any, fallback: string): string {
  return (
    payload?.data?.txnNo ||
    payload?.data?.orderId ||
    payload?.data?.order_id ||
    payload?.data?.merchant_transaction_id ||
    payload?.data?.transactionId ||
    fallback
  );
}

function createGatewayOrderId(prev = ""): string {
  let next = "";
  do {
    const stamp = Date.now().toString(36);
    const random = Math.random().toString(36).slice(2, 7);
    next = `O${stamp}${random}`.toUpperCase().slice(0, 19);
  } while (next === prev);
  return next;
}

function isDuplicateOrderError(payload: any): boolean {
  return /order\s*id\s*already\s*exists|duplicate|unique constraint/i.test(JSON.stringify(payload || {}));
}

async function postGateway(endpoint: string, payload: any, apiKey: string, includeApiKey: boolean) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (includeApiKey) headers["x-api-key"] = apiKey;
  return gatewayFetch(endpoint, { method: "POST", headers, body: JSON.stringify(payload) });
}

async function createHostedPaymentRequest(
  config: ReturnType<typeof getConfig>,
  amount: string,
  orderId: string,
  storeName: string,
  retryOnDuplicate = true,
) {
  const hostedEndpoint = makeUrl(config.baseUrl, PROVIDERS.card.initiatePath, config.merchantId);
  let hostedPayload = { amount, order_id: orderId, store_name: storeName };
  let result = await postGateway(hostedEndpoint, hostedPayload, config.apiKey, false);
  let retried = false;
  if (retryOnDuplicate && isDuplicateOrderError(result.payload)) {
    hostedPayload = { ...hostedPayload, order_id: createGatewayOrderId(orderId) };
    result = await postGateway(hostedEndpoint, hostedPayload, config.apiKey, false);
    retried = true;
  }
  return { ...result, requestPayload: hostedPayload, retriedDuplicateOrderId: retried };
}

function initiationPaymentStatus(payload: any, raw: string): "paid" | "pending" | "failed" {
  const transactionStatus = String(payload?.data?.transactionStatus || "").trim();
  const responseDesc = String(payload?.data?.responseDesc || payload?.message?.message || payload?.message || "").trim();
  const joined = `${transactionStatus} ${responseDesc} ${raw || ""}`.toLowerCase();
  if (/(completed|complete|paid|confirmed)/.test(transactionStatus.toLowerCase())) return "paid";
  if (/(failed|fail|declined|cancel|rejected|expired|not found|invalid|required field missing|unauthorized)/.test(joined)) return "failed";
  return "pending";
}

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, message: "Request body must be valid JSON." }, { status: 400 });
  }

  const config = getConfig();
  if (config.missing.length) {
    return NextResponse.json(
      { success: false, message: "SahulatPay is not configured on the server.", missing: config.missing },
      { status: 500 },
    );
  }

  const provider = normalizeProvider(body.provider);
  const amount = normalizeAmount(body.amount);
  const phone = String(body.phone || "").trim();
  const email = String(body.email || "").trim();
  const orderId = String(body.orderId || body.order_id || "").trim();
  const redirectUrl = String(body.redirectUrl || body.redirect_url || "").trim();
  const storeName = String(body.storeName || body.store_name || "SubscribAI").trim() || "SubscribAI";
  const isCard = provider === "card";

  if (!provider) return NextResponse.json({ success: false, message: "Choose JazzCash, Easypaisa, or Card." }, { status: 400 });
  if (!amount) return NextResponse.json({ success: false, message: "Payment amount is invalid." }, { status: 400 });
  if (!isCard && !validateWalletPhone(phone)) return NextResponse.json({ success: false, message: "Wallet phone must be in 03XXXXXXXXX format." }, { status: 400 });
  if (!orderId) return NextResponse.json({ success: false, message: "Order ID is required." }, { status: 400 });
  if (orderId.length >= 20) return NextResponse.json({ success: false, message: "Order ID must be less than 20 characters." }, { status: 400 });
  if (provider === "easypaisa" && !email) return NextResponse.json({ success: false, message: "Email is required for Easypaisa." }, { status: 400 });

  const providerConfig = PROVIDERS[provider as Exclude<ReturnType<typeof normalizeProvider>, "">];
  const walletMode = getProviderMode(provider as string);
  const useEncrypted = !isCard && walletMode === "encrypted" && providerConfig.encryptedInitiatePath && Boolean(config.masterSecret);
  const useDirectWallet = !isCard && !useEncrypted && walletMode !== "async" && Boolean(providerConfig.directInitiatePath);
  const endpointPath = useEncrypted
    ? providerConfig.encryptedInitiatePath!
    : useDirectWallet
      ? providerConfig.directInitiatePath!
      : providerConfig.initiatePath;
  const endpoint = makeUrl(config.baseUrl, endpointPath, config.merchantId);
  const directWalletAmount = normalizeAmountNumber(amount);
  const siteCallbackUrl = config.siteUrl ? `${config.siteUrl}/api/sahulatpay-callback` : "";
  const callbackUrl = isPublicHttpUrl(redirectUrl)
    ? redirectUrl
    : isPublicHttpUrl(siteCallbackUrl)
      ? siteCallbackUrl
      : "https://example.com/payment-return";

  const useNumberAmount = useDirectWallet && provider === "jazzcash";
  const payload: Record<string, unknown> = isCard
    ? { amount, order_id: orderId, store_name: storeName }
    : { amount: useNumberAmount ? directWalletAmount : amount, phone, order_id: orderId, type: "wallet" };
  // Return-URL field is endpoint-specific:
  //   • Wallet endpoints (initiate-jz, initiate-ep) → `redirect_url`
  //   • Hosted cashier endpoint (/payment-request/{merchantId}) → `link`
  //     (per AssanPay docs §Request Body — must be an https:// URL).
  if (provider === "jazzcash") payload.redirect_url = callbackUrl || "https://example.com/payment-return";
  if (isCard && isPublicHttpUrl(callbackUrl)) payload.link = callbackUrl;
  if (provider === "easypaisa") payload.email = email;

  let gatewayPayload: any;
  let gatewayStatus = 500;
  let gatewayMode = isCard
    ? "hosted"
    : useEncrypted
      ? "encrypted-wallet"
      : useDirectWallet
        ? "direct-wallet"
        : "async-wallet";
  let statusProvider: string = isCard ? "card" : (provider as string);
  let directFailure: any = null;
  let requestPayload: any = payload;
  let retriedDuplicateOrderId = false;

  try {
    const wireBody = useEncrypted
      ? buildEncryptedRequestBody(payload, config.masterSecret, config.merchantId)
      : payload;
    const includeApiKey = !useDirectWallet && !useEncrypted && !isCard;
    const initial = await postGateway(endpoint, wireBody, config.apiKey, includeApiKey);
    gatewayStatus = initial.status;
    gatewayPayload = initial.payload;
    if (useEncrypted) requestPayload = payload;

    if (isCard && isDuplicateOrderError(gatewayPayload)) {
      const hostedRetry = await createHostedPaymentRequest(config, amount, createGatewayOrderId(orderId), storeName);
      gatewayStatus = hostedRetry.status;
      gatewayPayload = hostedRetry.payload;
      requestPayload = hostedRetry.requestPayload;
      retriedDuplicateOrderId = true;
      gatewayMode = "hosted-retry";
    }

    const initialCode = gatewayCode(gatewayPayload, gatewayStatus);
    const initialInitiated = gatewayStatus >= 200 && gatewayStatus < 300 && gatewayPayload?.success === true && initialCode === 200;

    if (!isCard && useDirectWallet && !initialInitiated) {
      directFailure = {
        gatewayHttpStatus: gatewayStatus,
        gatewayStatus: gatewayPayload?.data?.statusCode || gatewayPayload?.message?.statusCode || gatewayPayload?.statusCode || initialCode,
        transactionId: gatewayTransactionId(gatewayPayload, orderId),
        gatewayResponse: gatewayPayload,
      };
      const fallbackOrderId = createGatewayOrderId(orderId);
      const hostedGateway = await createHostedPaymentRequest(config, amount, fallbackOrderId, storeName);
      gatewayStatus = hostedGateway.status;
      gatewayPayload = hostedGateway.payload;
      gatewayMode = hostedGateway.retriedDuplicateOrderId ? "hosted-fallback-retry" : "hosted-fallback";
      statusProvider = "card";
      requestPayload = hostedGateway.requestPayload;
      retriedDuplicateOrderId = true;
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: "Could not connect to SahulatPay.", details: error.message },
      { status: 502 },
    );
  }

  const gatewayCodeValue = gatewayCode(gatewayPayload, gatewayStatus);
  const hostedPaymentUrl = gatewayHostedUrl(gatewayPayload);
  const usesHostedPayment = isCard || gatewayMode.startsWith("hosted-fallback");
  const initiated =
    gatewayStatus >= 200 &&
    gatewayStatus < 300 &&
    gatewayPayload?.success === true &&
    gatewayCodeValue === 200 &&
    (!usesHostedPayment || isPublicHttpUrl(hostedPaymentUrl));
  const gatewayOrderId = requestPayload.order_id || orderId;
  const transactionId = gatewayTransactionId(gatewayPayload, gatewayOrderId);
  const rawGatewayStatus =
    gatewayPayload?.data?.statusCode ||
    gatewayPayload?.data?.transactionStatus ||
    gatewayPayload?.data?.status ||
    gatewayPayload?.message?.statusCode ||
    gatewayPayload?.statusCode;
  const paymentStatus = initiated ? initiationPaymentStatus(gatewayPayload, String(rawGatewayStatus || "")) : "failed";
  const gatewayMessage = friendlyGatewayMessage(gatewayPayload, `SahulatPay rejected the request with HTTP ${gatewayStatus}.`);
  const responseMessage = initiated
    ? gatewayMode.startsWith("hosted-fallback")
      ? "Wallet push could not start, so open the SahulatPay secure payment page."
      : isCard
        ? "Open the SahulatPay card payment page."
        : "Payment is processing."
    : gatewayMessage;

  console.info("SahulatPay create-payment", {
    provider, mode: gatewayMode, orderId, amount,
    phone: phone ? maskPhone(phone) : "",
    gatewayHttpStatus: gatewayStatus,
    transactionId, paymentStatus,
    gatewayMessage, gatewayOrderId, retriedDuplicateOrderId,
    directFailure: directFailure ? { gatewayHttpStatus: directFailure.gatewayHttpStatus, transactionId: directFailure.transactionId } : null,
  });

  return NextResponse.json(
    {
      success: initiated,
      provider, providerLabel: providerConfig.label, statusProvider,
      orderId, gatewayOrderId, transactionId, paymentStatus,
      gatewayStatus: rawGatewayStatus || gatewayCodeValue,
      gatewayHttpStatus: gatewayStatus,
      gatewayMessage, gatewayMode, retriedDuplicateOrderId,
      hostedAuthMode: usesHostedPayment ? "merchant-url" : "",
      redirectUrl: gatewayPayload?.data?.redirect_url || hostedPaymentUrl || null,
      message: responseMessage,
      hint: !initiated && provider === "jazzcash" && !isPublicHttpUrl(siteCallbackUrl)
        ? "For live JazzCash callback/redirect, deploy to Vercel and set SITE_URL to your public domain."
        : "",
      request: { amount: requestPayload.amount, order_id: orderId, ...(requestPayload.store_name ? { store_name: requestPayload.store_name } : {}) },
      gatewayResponse: gatewayPayload,
      directFailure,
    },
    { status: initiated ? 200 : Math.max(400, Math.min(gatewayStatus || 502, 599)) },
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: { "Cache-Control": "no-store", "Access-Control-Allow-Methods": "POST,OPTIONS" },
  });
}
