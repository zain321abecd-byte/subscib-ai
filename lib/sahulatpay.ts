import crypto from "node:crypto";

// SahulatPay / AssanPay endpoint catalog — verified against the integration manual.
// Amount type rules:
//   - initiate-jz       (JZ direct)  : number
//   - initiate-ep-v2    (EP direct)  : STRING
//   - initiate-jza/epa  (async)      : string
//   - initiate-*-new    (encrypted)  : string (inside encrypted body)
//   - payment-request/* (hosted)     : string

export type ProviderKey = "jazzcash" | "easypaisa" | "card";

export const PROVIDERS: Record<ProviderKey, {
  label: string;
  initiatePath: string;
  directInitiatePath?: string;
  encryptedInitiatePath?: string;
  statusPath: string;
  statusMethod: "GET" | "POST";
  hosted?: boolean;
}> = {
  jazzcash: {
    label: "JazzCash",
    initiatePath: "payment/initiate-jza",
    directInitiatePath: "payment/initiate-jz",
    encryptedInitiatePath: "payment/initiate-jz-new",
    statusPath: "payment/status-inquiry",
    statusMethod: "POST",
  },
  easypaisa: {
    label: "Easypaisa",
    initiatePath: "payment/initiate-epa-v2",
    directInitiatePath: "payment/initiate-ep-v2",
    encryptedInitiatePath: "payment/initiate-ep-new-v2",
    statusPath: "payment/inquiry-ep",
    statusMethod: "GET",
  },
  card: {
    label: "Card",
    initiatePath: "payment-request/otp",
    statusPath: "payment/all-inquiry",
    statusMethod: "GET",
    hosted: true,
  },
};

export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function readEnv(name: string): string {
  const raw = process.env[name];
  if (raw === undefined || raw === null) return "";
  return String(raw).replace(/^\s+|\s+$/g, "").replace(/[\r\n]/g, "");
}

export function getConfig() {
  const baseUrl = (readEnv("SAHULATPAY_BASE_URL") || "https://api.assanpay.com").replace(/\/+$/, "");
  const merchantId = readEnv("SAHULATPAY_MERCHANT_ID");
  const apiKey = readEnv("SAHULATPAY_API_KEY");
  const masterSecret = readEnv("SAHULATPAY_MASTER_SECRET_KEY");
  const siteUrl = readEnv("SITE_URL").replace(/\/+$/, "");
  const missing: string[] = [];
  const invalid: string[] = [];
  if (!merchantId) missing.push("SAHULATPAY_MERCHANT_ID");
  else if (!UUID_REGEX.test(merchantId)) invalid.push("SAHULATPAY_MERCHANT_ID (must be a UUID)");
  if (!apiKey) missing.push("SAHULATPAY_API_KEY");
  return { baseUrl, merchantId, apiKey, masterSecret, siteUrl, missing, invalid };
}

export function getProviderMode(provider: string): string {
  const providerEnv = readEnv(`SAHULATPAY_${String(provider).toUpperCase()}_MODE`);
  const fallback = readEnv("SAHULATPAY_WALLET_MODE") || "direct";
  return (providerEnv || fallback).toLowerCase();
}

export async function gatewayFetch(
  url: string,
  init: RequestInit = {},
  { attempts = 3, timeoutMs = 15000 } = {},
): Promise<{ status: number; payload: any }> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
      const text = await response.text();
      let payload: any;
      try {
        payload = text ? JSON.parse(text) : {};
      } catch {
        payload = { message: text };
      }
      return { status: response.status, payload };
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
      }
    }
  }
  throw new Error(
    `SahulatPay request failed after ${attempts} attempts: ${(lastError as Error)?.message || "unknown error"}`,
  );
}

// Encrypted-payload helpers (manual pages 17-19, 23-25)
export function deriveSahulatPayKeys(masterKey: string) {
  const hmacKey = crypto.createHmac("sha256", masterKey).update("HMAC_KEY").digest();
  const aesKey = crypto.createHmac("sha256", masterKey).update("ENC_KEY").digest().subarray(0, 32);
  return { hmacKey, aesKey };
}

export function encryptAesGcm(plaintext: string, aesKey: Buffer) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", aesKey, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    encryptedData: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
  };
}

export function buildEncryptedRequestBody(payload: any, masterKey: string, userId: string) {
  if (!masterKey) throw new Error("SAHULATPAY_MASTER_SECRET_KEY is required for encrypted mode.");
  const { hmacKey, aesKey } = deriveSahulatPayKeys(masterKey);
  const timestamp = new Date().toISOString();
  const { encryptedData, iv, tag } = encryptAesGcm(JSON.stringify(payload), aesKey);
  const signature = crypto
    .createHmac("sha256", hmacKey)
    .update(userId + timestamp + encryptedData)
    .digest("hex");
  return {
    userId,
    timestamp,
    encrypted_data: encryptedData,
    iv,
    tag,
    signature,
    master_secret_key: masterKey,
  };
}

export function makeUrl(baseUrl: string, path: string, merchantId: string): string {
  return `${baseUrl}/${path}/${encodeURIComponent(merchantId)}`;
}

export function isPublicHttpUrl(value: string | null | undefined): boolean {
  try {
    const url = new URL(String(value || ""));
    return ["http:", "https:"].includes(url.protocol)
      && !/^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(url.hostname);
  } catch {
    return false;
  }
}

export function normalizeProvider(value: unknown): ProviderKey | "" {
  const provider = String(value || "").trim().toLowerCase();
  return (PROVIDERS as any)[provider] ? (provider as ProviderKey) : "";
}

export function normalizeAmount(value: unknown): string {
  const number = Number(String(value || "").replace(/[^\d.]/g, ""));
  if (!Number.isFinite(number) || number <= 0) return "";
  return Number.isInteger(number) ? String(number) : number.toFixed(2);
}

export function normalizeAmountNumber(value: unknown): number | null {
  const amount = normalizeAmount(value);
  return amount ? Number(amount) : null;
}

export function validateWalletPhone(phone: unknown): boolean {
  return /^03\d{9}$/.test(String(phone || "").trim());
}

export function normalizePaymentStatus(value: unknown): "paid" | "pending" | "failed" {
  const status = String(value || "").toLowerCase();
  if (/(completed|complete|success|paid|confirmed|0000|000)/.test(status)) return "paid";
  if (/(failed|fail|declined|cancel|rejected|expired|not found)/.test(status)) return "failed";
  return "pending";
}

export function friendlyGatewayMessage(payload: any, fallback = "SahulatPay could not process this request."): string {
  if (!payload) return fallback;
  const messages: string[] = [];
  const keys = new Set(["message", "error", "statusText", "msg", "responseDesc", "transactionStatus", "status"]);
  const seen = new WeakSet();
  function walk(value: any, key = ""): void {
    if (value === null || value === undefined) return;
    if (typeof value === "string" || typeof value === "number") {
      const text = String(value).trim();
      if (text && (keys.has(key) || /error|fail|invalid|required|merchant|unauthorized|expired|not found/i.test(text))) {
        messages.push(text);
      }
      return;
    }
    if (typeof value !== "object" || seen.has(value)) return;
    seen.add(value);
    if (Array.isArray(value)) {
      value.forEach((item) => walk(item, key));
      return;
    }
    Object.entries(value).forEach(([k, v]) => walk(v, k));
  }
  walk(payload);
  const unique = [...new Set(messages)].filter((m) => m && m !== "false" && !/undefined\s+undefined/i.test(m));
  if (unique.length) return unique.slice(0, 3).join(" ");
  const compact = JSON.stringify(payload);
  return compact && compact !== "{}" ? `${fallback} Gateway response: ${compact.slice(0, 420)}` : fallback;
}
