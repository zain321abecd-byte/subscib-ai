import { Injectable, Logger } from "@nestjs/common";
import { SupabaseService } from "../supabase/supabase.service";
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
  normalizePaymentStatus,
  normalizeProvider,
  type SahulatPayConfig,
  validateWalletPhone,
} from "./sahulatpay";

export type CreatePaymentInput = {
  provider?: string;
  amount?: unknown;
  phone?: string;
  email?: string;
  orderId?: string;
  order_id?: string;
  redirectUrl?: string;
  redirect_url?: string;
  storeName?: string;
  store_name?: string;
};

export type PaymentStatusQuery = {
  provider?: string;
  orderId?: string;
  transactionId?: string;
};

/** Result wrapper so the controller can set the right HTTP status. */
export type ServiceResult = { status: number; body: any };

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
  config: SahulatPayConfig,
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

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(private readonly supabase: SupabaseService) {}

  // ── create-payment ────────────────────────────────────────────────────────
  async createPayment(body: CreatePaymentInput): Promise<ServiceResult> {
    const config = getConfig();
    if (config.missing.length) {
      return {
        status: 500,
        body: { success: false, message: "SahulatPay is not configured on the server.", missing: config.missing },
      };
    }

    const provider = normalizeProvider(body.provider);
    const amount = normalizeAmount(body.amount);
    const phone = String(body.phone || "").trim();
    const email = String(body.email || "").trim();
    const orderId = String(body.orderId || body.order_id || "").trim();
    const redirectUrl = String(body.redirectUrl || body.redirect_url || "").trim();
    const storeName = String(body.storeName || body.store_name || "SubscribAI").trim() || "SubscribAI";
    const isCard = provider === "card";

    if (!provider) return { status: 400, body: { success: false, message: "Choose JazzCash, Easypaisa, or Card." } };
    if (!amount) return { status: 400, body: { success: false, message: "Payment amount is invalid." } };
    if (!isCard && !validateWalletPhone(phone)) return { status: 400, body: { success: false, message: "Wallet phone must be in 03XXXXXXXXX format." } };
    if (!orderId) return { status: 400, body: { success: false, message: "Order ID is required." } };
    if (orderId.length >= 20) return { status: 400, body: { success: false, message: "Order ID must be less than 20 characters." } };
    if (provider === "easypaisa" && !email) return { status: 400, body: { success: false, message: "Email is required for Easypaisa." } };

    const providerConfig = PROVIDERS[provider as Exclude<ReturnType<typeof normalizeProvider>, "">];
    const walletMode = getProviderMode(provider as string);
    const useEncrypted = !isCard && walletMode === "encrypted" && !!providerConfig.encryptedInitiatePath && Boolean(config.masterSecret);
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
      return {
        status: 502,
        body: { success: false, message: "Could not connect to SahulatPay.", details: error.message },
      };
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

    this.logger.log(
      `create-payment provider=${provider} mode=${gatewayMode} order=${orderId} amount=${amount} ` +
        `phone=${phone ? maskPhone(phone) : ""} http=${gatewayStatus} txn=${transactionId} status=${paymentStatus}`,
    );

    return {
      status: initiated ? 200 : Math.max(400, Math.min(gatewayStatus || 502, 599)),
      body: {
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
          ? "For live JazzCash callback/redirect, deploy and set SITE_URL to your public domain."
          : "",
        request: { amount: requestPayload.amount, order_id: orderId, ...(requestPayload.store_name ? { store_name: requestPayload.store_name } : {}) },
        gatewayResponse: gatewayPayload,
        directFailure,
      },
    };
  }

  // ── payment-status ────────────────────────────────────────────────────────
  async getStatus(query: PaymentStatusQuery): Promise<ServiceResult> {
    const config = getConfig();
    if (config.missing.length) {
      return { status: 500, body: { success: false, message: "SahulatPay is not configured on the server.", missing: config.missing } };
    }

    const provider = normalizeProvider(query.provider);
    const orderId = String(query.orderId || "").trim();
    const transactionId = String(query.transactionId || orderId).trim();

    if (!provider) return { status: 400, body: { success: false, message: "Provider is required." } };
    if (!orderId && !transactionId) return { status: 400, body: { success: false, message: "Order ID or transaction ID is required." } };

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
      return { status: 502, body: { success: false, message: "Could not connect to SahulatPay.", details: error.message } };
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

    return {
      status: callSucceeded ? 200 : Math.max(400, Math.min(gatewayHttpStatus || 502, 599)),
      body: {
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
    };
  }

  // ── callback (server-to-server + browser redirect) ─────────────────────────
  async handleCallback(payload: Record<string, any>, method: string) {
    const orderId = String(payload.order_id || payload.orderId || payload.transactionId || "").trim();
    const rawStatus = payload.status || payload.transactionStatus || payload.responseDesc || "";
    const paymentStatus = normalizePaymentStatus(rawStatus);

    this.logger.log(`SahulatPay callback ${method} order=${orderId} status=${paymentStatus} raw=${String(rawStatus).slice(0, 80)}`);
    await this.syncOrderStatus(orderId, paymentStatus);

    return {
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
    };
  }

  /** Map gateway payment_status onto our orders table by transaction_id. */
  private async syncOrderStatus(transactionId: string, paymentStatus: string) {
    if (!transactionId) return;
    const status =
      paymentStatus === "paid" ? "paid" :
      paymentStatus === "failed" ? "failed" :
      paymentStatus === "pending" ? "pending" : null;
    if (!status) return;
    try {
      await this.supabase.admin().from("orders").update({ status }).eq("transaction_id", transactionId);
    } catch (e) {
      this.logger.error(`order status sync failed: ${(e as Error).message}`);
    }
  }
}
