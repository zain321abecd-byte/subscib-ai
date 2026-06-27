import * as crypto from "node:crypto";

/**
 * PayFast (apps.net.pk) gateway client — hosted-checkout redirection flow only.
 * See the Merchant Integration Guide v1.2:
 *  1. POST /GetAccessToken with MERCHANT_ID/SECURED_KEY/BASKET_ID/TXNAMT/CURRENCY_CODE
 *  2. Browser form-POST to /PostTransaction with the token + order details
 *  3. PayFast redirects the customer back to SUCCESS_URL/FAILURE_URL with err_code etc.
 *  4. PayFast also pings CHECKOUT_URL (IPN) with the same fields server-to-server.
 *  5. validation_hash = sha256("basket_id|secured_key|merchant_id|err_code") — verify.
 */

const USER_AGENT = "SubscribAI-NestJS/1.0 (PayFast Integration)";

function readEnv(name: string): string {
  const raw = process.env[name];
  if (raw === undefined || raw === null) return "";
  return String(raw).replace(/^\s+|\s+$/g, "").replace(/[\r\n]/g, "");
}

export type PayFastConfig = {
  baseUrl: string;     // e.g. https://ipg.apps.net.pk  (production)  |  https://ipguat.apps.net.pk (UAT)
  merchantId: string;  // numeric merchant id from PayFast portal
  merchantName: string;
  securedKey: string;
  siteUrl: string;
  currency: string;    // PKR
  missing: string[];
};

export function getConfig(): PayFastConfig {
  const baseUrl = (readEnv("PAYFAST_BASE_URL") || "https://ipg.apps.net.pk").replace(/\/+$/, "");
  const merchantId = readEnv("PAYFAST_MERCHANT_ID");
  const merchantName = readEnv("PAYFAST_MERCHANT_NAME") || "SubscribAI";
  const securedKey = readEnv("PAYFAST_SECURED_KEY");
  const siteUrl = readEnv("SITE_URL").replace(/\/+$/, "");
  const currency = (readEnv("PAYFAST_CURRENCY") || "PKR").toUpperCase();
  const missing: string[] = [];
  if (!merchantId) missing.push("PAYFAST_MERCHANT_ID");
  if (!securedKey) missing.push("PAYFAST_SECURED_KEY");
  return { baseUrl, merchantId, merchantName, securedKey, siteUrl, currency, missing };
}

/** Strict basket-id rule — keep below 20 chars, alphanumeric + dash/underscore. */
export function isValidBasketId(basketId: string): boolean {
  return /^[A-Za-z0-9_-]{1,20}$/.test(basketId);
}

/** PayFast wants ORDER_DATE as YYYY-MM-DD. */
export function orderDateForToday(now = new Date()): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Normalize amount to "0.00"-style string PayFast accepts. */
export function normalizeAmount(input: unknown): string {
  const num = typeof input === "number" ? input : Number(String(input).replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(num) || num <= 0) return "";
  return num.toFixed(2);
}

/**
 * STEP 1 — fetch an access token. PayFast forbids empty user-agents, so we
 * always send the explicit UA. Body is x-www-form-urlencoded per the PDF.
 *
 * `currency` overrides the env default per-request — used to send USD for
 * non-PK visitors. The same currency must be used here AND in the form-POST
 * (PDF: "TXNAMT must match the amount sent in the token API").
 */
export async function getAccessToken(params: {
  basketId: string;
  amount: string;
  config: PayFastConfig;
  currency?: string;
}): Promise<{ token: string; raw: any; httpStatus: number }> {
  const { basketId, amount, config } = params;
  const currency = (params.currency || config.currency || "PKR").toUpperCase();
  const url = `${config.baseUrl}/Ecommerce/api/Transaction/GetAccessToken`;
  const body = new URLSearchParams({
    MERCHANT_ID: config.merchantId,
    SECURED_KEY: config.securedKey,
    BASKET_ID: basketId,
    TXNAMT: amount,
    CURRENCY_CODE: currency,
  }).toString();

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": USER_AGENT,
      Accept: "application/json",
    },
    body,
  });
  const text = await res.text();
  let payload: any = null;
  try { payload = JSON.parse(text); } catch { payload = { raw: text }; }
  const token = String(payload?.ACCESS_TOKEN || payload?.access_token || "").trim();
  return { token, raw: payload, httpStatus: res.status };
}

/**
 * STEP 2 — fields to POST as a hidden HTML form. We return them so the
 * frontend can auto-submit (faster) or the API can render an auto-submit
 * page. Either way the customer ends up on the PayFast hosted checkout.
 */
export type PostTransactionFields = Record<string, string>;

/** Per PDF Table 1.1 page 12 — locks the hosted page to a single method. */
export type PayFastTransactionInstrument = 1 | 2 | 3 | 4;
export const TRANSACTION_INSTRUMENT = {
  bank: 1 as const,
  unionpay: 2 as const,
  card: 3 as const,
  wallet: 4 as const,
};

export function buildPostTransactionFields(input: {
  config: PayFastConfig;
  token: string;
  basketId: string;
  amount: string;
  customerEmail: string;
  customerMobile: string;
  customerName?: string;
  customerIp?: string;
  description?: string;
  successUrl: string;
  failureUrl: string;
  checkoutUrl: string; // IPN
  items?: Array<{ sku?: string; name?: string; price?: number | string; qty?: number | string }>;
  /** Optional — when set, the hosted page shows ONLY this payment method. */
  transactionInstrument?: PayFastTransactionInstrument;
  /** Override the env default for this transaction (e.g. USD for foreigners). */
  currency?: string;
}): PostTransactionFields {
  const f: PostTransactionFields = {
    MERCHANT_ID: input.config.merchantId,
    MERCHANT_NAME: input.config.merchantName,
    TOKEN: input.token,
    PROCCODE: "00",
    TXNAMT: input.amount,
    CUSTOMER_MOBILE_NO: input.customerMobile,
    CUSTOMER_EMAIL_ADDRESS: input.customerEmail,
    SIGNATURE: crypto.randomBytes(12).toString("hex"),
    VERSION: "SUBSCRIBAI-1.0",
    TXNDESC: (input.description || "SubscribAI order").slice(0, 80),
    SUCCESS_URL: input.successUrl,
    FAILURE_URL: input.failureUrl,
    BASKET_ID: input.basketId,
    ORDER_DATE: orderDateForToday(),
    CHECKOUT_URL: input.checkoutUrl,
    CURRENCY_CODE: (input.currency || input.config.currency || "PKR").toUpperCase(),
    TRAN_TYPE: "ECOMM_PURCHASE",
  };
  if (input.customerName) f.CUSTOMER_NAME = input.customerName;
  if (input.customerIp) f.CUSTOMER_IPADDRESS = input.customerIp;
  if (input.transactionInstrument) f.Transaction_Instrument = String(input.transactionInstrument);
  (input.items || []).forEach((item, i) => {
    if (item.sku) f[`ITEMS[${i}][SKU]`] = String(item.sku);
    if (item.name) f[`ITEMS[${i}][NAME]`] = String(item.name);
    if (item.price !== undefined && item.price !== null) f[`ITEMS[${i}][PRICE]`] = String(item.price);
    if (item.qty !== undefined && item.qty !== null) f[`ITEMS[${i}][QTY]`] = String(item.qty);
  });
  return f;
}

export function postTransactionEndpoint(config: PayFastConfig): string {
  return `${config.baseUrl}/Ecommerce/api/Transaction/PostTransaction`;
}

/**
 * STEP 4 — verify the validation hash on the return/IPN payload.
 * sha256("basket_id|secured_key|merchant_id|err_code")
 */
export function verifyValidationHash(input: {
  basketId: string;
  errCode: string;
  merchantId: string;
  securedKey: string;
  receivedHash: string;
}): boolean {
  const composed = `${input.basketId}|${input.securedKey}|${input.merchantId}|${input.errCode}`;
  const expected = crypto.createHash("sha256").update(composed, "utf8").digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(String(input.receivedHash || "").toLowerCase(), "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/** PayFast considers "000" or "00" as success. */
export function isPayFastSuccess(errCode: unknown): boolean {
  const code = String(errCode || "").trim();
  return code === "000" || code === "00";
}

/**
 * Known terminal-failure codes. Anything outside this set (and not a success)
 * is treated as PENDING — wallet flows (JazzCash/Easypaisa) sometimes return
 * an undocumented "in-progress" code on the browser redirect BEFORE the wallet
 * has actually settled. The IPN is the authoritative event that arrives later.
 */
const KNOWN_FAILURE_CODES = new Set([
  "002", // time out
  "97",  // insufficient balance
  "106", // tx limit exceeded
  "03",  // inactive account
  "04",  // closed account
  "104", // entered details incorrect
  "55",  // invalid OTP/PIN
  "54",  // card expired
  "13",  // invalid amount
  "126", // invalid account details
  "75",  // max PIN retries
  "14",  // inactive card
  "15",  // inactive card
  "42",  // invalid CNIC
  "423", // unable to process
  "41",  // details mismatch
  "600", // OTP expired
  "309", // invalid OTP length
  "853", // invalid account details
  "537", // dormant account
  "359", // blocked account
  "806", // OTP could not be verified
  "807", // too many attempts
  "9000", // FRMS rejected
  "9010", // FRMS error
  "308", // invalid account details
  "880", // local ecommerce not activated
  "881", // insufficient funds (bank)
  "882", // daily limit consumed
  "883", // local e-payment not activated
]);

export function paymentStatusFromErrCode(errCode: unknown): "paid" | "failed" | "pending" {
  const code = String(errCode || "").trim();
  if (!code) return "pending";
  if (isPayFastSuccess(code)) return "paid";
  if (KNOWN_FAILURE_CODES.has(code)) return "failed";
  // Unknown codes (e.g. 1301 from wallet flows) → trust the IPN, not the redirect.
  return "pending";
}

/** Human-readable mapping for the common PayFast error codes from the PDF. */
const ERROR_DESCRIPTIONS: Record<string, string> = {
  "000": "Payment successful",
  "00": "Payment successful",
  "002": "Payment timed out at the gateway. Please try again.",
  "97": "Insufficient balance — please top up and try again.",
  "106": "Transaction limit exceeded — contact your bank.",
  "03": "Account is inactive — please use a different account.",
  "104": "Entered details are incorrect.",
  "55": "Invalid OTP/PIN.",
  "54": "Card has expired.",
  "13": "Invalid amount.",
  "126": "Account details are invalid.",
  "75": "Maximum PIN retries exceeded.",
  "14": "Inactive card number.",
  "15": "Inactive card number.",
  "42": "Invalid CNIC.",
  "423": "We could not process your request right now. Please try again later.",
  "41": "Entered details did not match.",
  "600": "OTP already expired.",
  "309": "Invalid OTP length.",
  "853": "Account details are invalid.",
  "04": "Account is closed.",
  "537": "Account is dormant.",
  "359": "Account is blocked.",
  "880": "Local ecommerce session not activated — please call your bank.",
  "881": "Insufficient funds — please call your bank.",
  "882": "Daily ecommerce transaction limit consumed.",
  "883": "Local e-payment service not activated — please call your bank.",
};

export function describeErrCode(errCode: unknown, fallback?: string): string {
  const code = String(errCode || "").trim();
  return ERROR_DESCRIPTIONS[code] || fallback || "Payment could not be completed.";
}
