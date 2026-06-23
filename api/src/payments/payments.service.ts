import { Injectable, Logger } from "@nestjs/common";
import { SupabaseService } from "../supabase/supabase.service";
import {
  TRANSACTION_INSTRUMENT,
  buildPostTransactionFields,
  describeErrCode,
  getAccessToken,
  getConfig,
  isPayFastSuccess,
  isValidBasketId,
  normalizeAmount,
  paymentStatusFromErrCode,
  postTransactionEndpoint,
  verifyValidationHash,
  type PayFastConfig,
  type PayFastTransactionInstrument,
} from "./payfast";

export type RestrictTo = "bank" | "unionpay" | "card" | "wallet";

export type ServiceResult = { status: number; body: any };

export type InitPaymentInput = {
  basketId?: string;
  basket_id?: string;
  orderId?: string;
  order_id?: string;
  amount?: unknown;
  customerEmail?: string;
  customer_email?: string;
  customerMobile?: string;
  customer_mobile?: string;
  customerName?: string;
  customer_name?: string;
  customerIp?: string;
  description?: string;
  items?: Array<{ sku?: string; name?: string; price?: number | string; qty?: number | string }>;
  /** Lock the PayFast hosted page to one method. Useful for non-PK visitors
   * who can only realistically pay by card. Maps to Transaction_Instrument. */
  restrictTo?: RestrictTo;
  transactionInstrument?: PayFastTransactionInstrument;
  /** Currency code sent to PayFast (defaults to env PAYFAST_CURRENCY = PKR).
   * For non-PK visitors the frontend sends "USD" plus the converted amount. */
  currency?: string;
};

/** Payload PayFast sends on browser return + IPN. Per Table 1.2 of the PDF. */
export type PayFastReturnPayload = {
  transaction_id?: string;
  err_code?: string;
  err_msg?: string;
  basket_id?: string;
  order_date?: string;
  validation_hash?: string;
  PaymentName?: string;
  discounted_amount?: string;
  transaction_amount?: string;
  merchant_amount?: string;
  transaction_currency?: string;
  Instrument_token?: string;
  Recurring_txn?: string;
  [k: string]: unknown;
};

/** Build the public-facing URLs PayFast will use (success/failure/IPN). */
function buildCallbackUrls(config: PayFastConfig) {
  const apiBase = (process.env.PAYFAST_PUBLIC_API_URL || process.env.PUBLIC_API_URL || "").replace(/\/+$/, "");
  // Fallback: use SITE_URL host with /api prefix; in practice deployers set PAYFAST_PUBLIC_API_URL.
  const base = apiBase || config.siteUrl;
  return {
    successUrl: `${base}/payments/return?outcome=success`,
    failureUrl: `${base}/payments/return?outcome=failure`,
    checkoutUrl: `${base}/payments/ipn`,
  };
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(private readonly supabase: SupabaseService) {}

  // ── STEP 1+2 — initiate the PayFast handshake ─────────────────────────────
  async initPayment(input: InitPaymentInput): Promise<ServiceResult> {
    const config = getConfig();
    if (config.missing.length) {
      return {
        status: 500,
        body: { success: false, message: "PayFast is not configured on the server.", missing: config.missing },
      };
    }

    const basketId = String(input.basketId || input.basket_id || input.orderId || input.order_id || "").trim();
    const amount = normalizeAmount(input.amount);
    const customerEmail = String(input.customerEmail || input.customer_email || "").trim();
    const customerMobile = String(input.customerMobile || input.customer_mobile || "").trim();
    const customerName = String(input.customerName || input.customer_name || "").trim();
    const customerIp = String(input.customerIp || "").trim();
    const description = String(input.description || "SubscribAI order").slice(0, 80);

    if (!basketId) return { status: 400, body: { success: false, message: "Order/basket ID is required." } };
    if (!isValidBasketId(basketId)) return { status: 400, body: { success: false, message: "Basket ID must be alphanumeric (with - or _) and under 20 characters." } };
    if (!amount) return { status: 400, body: { success: false, message: "Payment amount is invalid." } };
    if (!customerEmail) return { status: 400, body: { success: false, message: "Customer email is required." } };
    if (!customerMobile) return { status: 400, body: { success: false, message: "Customer mobile number is required." } };

    // PayFast settles in a single currency configured per-merchant (per their
    // support team: merchant 619747 settles in USD only). We allow the
    // frontend to send `currency` per request so foreign visitors pay in USD,
    // but default to the env value when not supplied.
    const currency = (input.currency || config.currency || "PKR").toUpperCase();

    // STEP 1 — fetch the access token.
    let token = "";
    let tokenHttp = 0;
    let tokenRaw: any = null;
    try {
      const r = await getAccessToken({ basketId, amount, config, currency });
      token = r.token;
      tokenHttp = r.httpStatus;
      tokenRaw = r.raw;
    } catch (err: any) {
      return { status: 502, body: { success: false, message: "Could not reach PayFast.", details: err?.message } };
    }
    if (!token) {
      const reason =
        (tokenRaw && typeof tokenRaw === "object" && (tokenRaw.ExceptionMessage || tokenRaw.Message)) ||
        "PayFast did not return an access token.";
      this.logger.warn(`payfast token rejected http=${tokenHttp} reason=${String(reason).slice(0, 200)}`);
      return {
        status: tokenHttp >= 400 ? tokenHttp : 502,
        body: {
          success: false,
          message: `PayFast rejected the token request: ${String(reason).slice(0, 300)}`,
          gatewayHttpStatus: tokenHttp,
          gatewayResponse: tokenRaw,
        },
      };
    }

    // Map restrictTo → Transaction_Instrument (single-method lock).
    const instrument: PayFastTransactionInstrument | undefined =
      input.transactionInstrument && [1, 2, 3, 4].includes(input.transactionInstrument)
        ? input.transactionInstrument
        : input.restrictTo
          ? TRANSACTION_INSTRUMENT[input.restrictTo]
          : undefined;

    // STEP 2 — build the form fields the browser will POST to PayFast.
    const urls = buildCallbackUrls(config);
    const fields = buildPostTransactionFields({
      config,
      token,
      basketId,
      amount,
      customerEmail,
      customerMobile,
      customerName,
      customerIp,
      description,
      successUrl: urls.successUrl,
      failureUrl: urls.failureUrl,
      checkoutUrl: urls.checkoutUrl,
      items: input.items,
      transactionInstrument: instrument,
      currency,
    });

    this.logger.log(`payfast init basket=${basketId} amount=${amount} token=${token.slice(0, 8)}…`);

    return {
      status: 200,
      body: {
        success: true,
        action: postTransactionEndpoint(config),
        method: "POST",
        fields,
        basketId,
        amount,
      },
    };
  }

  // ── STEP 3 — browser return (PayFast hits SUCCESS_URL / FAILURE_URL) ───────
  /**
   * Validates the payload, syncs the order, returns where to redirect the
   * customer. The controller takes the redirect target and sends a 303.
   */
  async handleReturn(payload: PayFastReturnPayload): Promise<{
    basketId: string;
    paymentStatus: "paid" | "failed" | "pending";
    errCode: string;
    errMsg: string;
    hashOk: boolean;
  }> {
    const config = getConfig();
    const basketId = String(payload.basket_id || "").trim();
    const errCode = String(payload.err_code || "").trim();
    const errMsg = String(payload.err_msg || "").trim();
    const receivedHash = String(payload.validation_hash || "").trim();

    const hashOk = basketId && errCode && receivedHash && !config.missing.length
      ? verifyValidationHash({
          basketId,
          errCode,
          merchantId: config.merchantId,
          securedKey: config.securedKey,
          receivedHash,
        })
      : false;

    const paymentStatus = paymentStatusFromErrCode(errCode);

    this.logger.log(
      `payfast return basket=${basketId} err_code=${errCode} status=${paymentStatus} hash=${hashOk ? "ok" : "bad"} txn=${payload.transaction_id || ""}`,
    );

    if (hashOk && basketId) {
      await this.syncOrder({
        basketId,
        paymentStatus,
        transactionId: String(payload.transaction_id || ""),
      });
    } else if (basketId) {
      this.logger.warn(
        `payfast return hash mismatch (basket=${basketId}) — payload kept but order NOT marked paid.`,
      );
    }

    return { basketId, paymentStatus, errCode, errMsg, hashOk };
  }

  // ── STEP 4 — server-to-server IPN ─────────────────────────────────────────
  async handleIpn(payload: PayFastReturnPayload): Promise<ServiceResult> {
    const result = await this.handleReturn(payload);
    return {
      status: 200,
      body: {
        received: true,
        message: result.hashOk
          ? "PayFast IPN accepted."
          : "PayFast IPN received but validation_hash did not match — ignored.",
        basketId: result.basketId,
        paymentStatus: result.paymentStatus,
        errCode: result.errCode,
        errMsg: result.errMsg,
        hashOk: result.hashOk,
      },
    };
  }

  // ── Poll a known order's status (used by /thank-you to show progress). ────
  async getStatus(query: { basketId?: string; basket_id?: string; orderId?: string }): Promise<ServiceResult> {
    const basketId = String(query.basketId || query.basket_id || query.orderId || "").trim();
    if (!basketId) return { status: 400, body: { success: false, message: "basketId is required." } };

    try {
      const { data, error } = await this.supabase
        .admin()
        .from("orders")
        .select("id, order_number, status, transaction_id, subtotal_pkr, payment_method")
        .or(`order_number.eq.${basketId},id.eq.${basketId}`)
        .maybeSingle();

      if (error) {
        return { status: 500, body: { success: false, message: error.message } };
      }
      if (!data) {
        return { status: 200, body: { success: true, basketId, status: "pending", message: "Order not yet recorded." } };
      }
      return {
        status: 200,
        body: {
          success: true,
          basketId,
          orderId: data.id,
          orderNumber: data.order_number,
          status: data.status,
          transactionId: data.transaction_id,
          paymentMethod: data.payment_method,
          amount: data.subtotal_pkr,
          message: describeErrCode("", "Status retrieved from order record."),
        },
      };
    } catch (err: any) {
      return { status: 500, body: { success: false, message: err?.message || "Lookup failed." } };
    }
  }

  // ── persistence ───────────────────────────────────────────────────────────
  private async syncOrder(params: { basketId: string; paymentStatus: "paid" | "failed" | "pending"; transactionId: string }) {
    const { basketId, paymentStatus, transactionId } = params;
    const status =
      paymentStatus === "paid" ? "paid" :
      paymentStatus === "failed" ? "failed" :
      "pending";

    try {
      const isUuid = /^[0-9a-f-]{36}$/i.test(basketId);
      const filterCol = isUuid ? "id" : "order_number";
      const update: Record<string, unknown> = { status, payment_method: "payfast" };
      if (transactionId) update.transaction_id = transactionId;

      await this.supabase
        .admin()
        .from("orders")
        .update(update as never)
        .eq(filterCol, basketId);
    } catch (e) {
      this.logger.error(`order status sync failed: ${(e as Error).message}`);
    }
  }
}

export { isPayFastSuccess };
