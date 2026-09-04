import { createHash } from "node:crypto";
import type { DeliveryVariables } from "./delivery.types";

/**
 * Template rendering + phone normalisation for delivery messages.
 *
 * Placeholder syntax: `{{variable}}` (canonical) and `{variable}` (the shorter
 * form the Daily Sales reminder templates already use). Both are accepted so
 * an admin can paste either style.
 */

export interface TemplateVariable {
  key: keyof DeliveryVariables & string;
  label: string;
  /** Shown in the composer's variable list. */
  example: string;
  /** Filled automatically from site settings / the order — not typed by hand. */
  auto?: boolean;
}

export const TEMPLATE_VARIABLES: readonly TemplateVariable[] = [
  { key: "customer_name",     label: "Customer name",        example: "Ahmed Raza" },
  { key: "subscription_name", label: "Subscription / product", example: "ChatGPT Plus" },
  { key: "plan_name",         label: "Plan",                 example: "1 Month · Private" },
  { key: "email",             label: "Login email",          example: "user@example.com" },
  { key: "password",          label: "Password",             example: "Str0ngPass!" },
  { key: "account_details",   label: "Account details",      example: "Profile 2 · PIN 1234" },
  { key: "start_date",        label: "Activation date",      example: "4 Sep 2026" },
  { key: "renewal_date",      label: "Renewal date",         example: "4 Oct 2026" },
  { key: "expiry_date",       label: "Expiry date",          example: "4 Oct 2026" },
  { key: "notes",             label: "Additional notes",     example: "Do not log out." },
  { key: "order_number",      label: "Order number",         example: "SB-10241" },
  { key: "support_email",     label: "Support email",        example: "support@subscribai.com", auto: true },
  { key: "support_whatsapp",  label: "Support WhatsApp",     example: "+92 300 1234567",        auto: true },
  { key: "brand_name",        label: "Business name",        example: "SubscribAI",             auto: true },
];

const VARIABLE_KEYS = new Set<string>(TEMPLATE_VARIABLES.map((v) => v.key));

/**
 * `{{x}}` is tried before `{x}`, so the double-brace form always wins at a
 * given position — no lookbehind needed.
 */
const PLACEHOLDER = /\{\{\s*([a-z0-9_]+)\s*\}\}|\{\s*([a-z0-9_]+)\s*\}/gi;

/**
 * A line with nothing left but punctuation, or nothing but a label
 * ("Password:"). Used to decide whether a line whose variables all came in
 * empty should be dropped instead of shipped as a bare heading.
 */
const LABEL_ONLY = /^[^A-Za-z0-9]*$|^[^:]{0,60}:[^A-Za-z0-9]*$/;

export interface RenderResult {
  text: string;
  /** Known variables the template asked for but that came in empty. */
  missing: string[];
  /** Placeholders in the template that aren't in the variable catalog. */
  unknown: string[];
}

/**
 * Substitute variables into a template body.
 *
 * Rules, mirrored by the admin-side copy in lib/delivery.ts:
 *   - `{{var}}` and `{var}` are both accepted.
 *   - An unknown or empty variable is never shipped to the customer as
 *     literal `{{password}}` text.
 *   - A line that was ONLY placeholders and resolved to nothing is dropped,
 *     and so is the label line above it ("Password:") — otherwise the message
 *     goes out with a heading and blank space under it.
 *   - Three or more consecutive newlines collapse to one blank line.
 *
 * Missing and unknown keys are reported back so the composer can warn the
 * admin BEFORE they hit send.
 */
export function renderTemplate(body: string, vars: DeliveryVariables): RenderResult {
  const missing = new Set<string>();
  const unknown = new Set<string>();
  const kept: string[] = [];

  for (const rawLine of (body ?? "").split("\n")) {
    let placeholders = 0;
    let filled = 0;

    let line = rawLine.replace(PLACEHOLDER, (_match, doubled?: string, single?: string) => {
      const key = String(doubled ?? single ?? "").toLowerCase();
      placeholders++;
      const known = VARIABLE_KEYS.has(key);
      const raw = known ? (vars as Record<string, unknown>)[key] : undefined;
      const value = raw == null ? "" : String(raw).trim();
      if (!known) unknown.add(key);
      else if (!value) missing.add(key);
      if (value) filled++;
      return value;
    });

    if (placeholders > 0 && filled < placeholders) {
      // An empty substitution mid-sentence leaves a double space, or a space
      // in front of punctuation. Tidy only the lines that lost something.
      line = line.replace(/[^\S\n]{2,}/g, " ").replace(/[^\S\n]+([,.;:!?])/g, "$1");
    }

    if (placeholders > 0 && filled === 0 && LABEL_ONLY.test(line)) {
      // Nothing of substance survived on this line — drop it, and drop the
      // label sitting above it ("Password:" over a now-empty value line).
      if (kept.length > 0 && /:\s*$/.test(kept[kept.length - 1])) kept.pop();
      continue;
    }
    kept.push(line.replace(/[^\S\n]+$/, ""));
  }

  return {
    text: kept.join("\n").replace(/\n{3,}/g, "\n\n").trim(),
    missing: [...missing].sort(),
    unknown: [...unknown].sort(),
  };
}

/** Mask a secret for display / logging: keeps nothing, shows length only. */
export function maskSecret(value: string | null | undefined): string {
  if (!value) return "";
  return "•".repeat(Math.min(12, Math.max(6, value.length)));
}

/**
 * Replace the password value inside an already-rendered message. Used when a
 * masked copy of the body is wanted (e.g. a UI list) without re-rendering.
 */
export function maskPasswordInText(text: string, password: string | null | undefined): string {
  if (!password) return text;
  return text.split(password).join(maskSecret(password));
}

/**
 * Normalise a typed phone number to E.164, defaulting to Pakistan.
 *
 * Accepts: +923001234567, 00923001234567, 923001234567, 03001234567,
 * 3001234567, and any of those with spaces / dashes / brackets.
 * Returns null when the result can't be a valid international number.
 *
 * The Next.js side validates with libphonenumber-js before calling the API;
 * this is the backend's own independent check (never trust the caller).
 */
export function normalizePhone(raw: string | null | undefined, defaultCountryCode = "92"): string | null {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  const hadPlus = trimmed.startsWith("+");
  let digits = trimmed.replace(/\D+/g, "");
  if (!digits) return null;

  if (!hadPlus) {
    if (digits.startsWith("00")) {
      digits = digits.slice(2);                                   // 0092… → 92…
    } else if (digits.startsWith("0")) {
      digits = defaultCountryCode + digits.slice(1);              // 0300… → 92300…
    } else if (digits.length === 10 && defaultCountryCode === "92") {
      digits = defaultCountryCode + digits;                       // 3001234567 → 923001234567
    }
  }

  // E.164: 8–15 digits, country code can't start with 0.
  if (digits.length < 8 || digits.length > 15 || digits.startsWith("0")) return null;
  return `+${digits}`;
}

export function isE164(value: string | null | undefined): boolean {
  return typeof value === "string" && /^\+[1-9]\d{7,14}$/.test(value);
}

/** Digits only — what wa.me links want. */
export function waDigits(phone: string): string {
  return phone.replace(/\D+/g, "");
}

/** Build a WhatsApp deep link that opens the chat with the message pre-typed. */
export function waLink(phone: string, message: string): string {
  return `https://wa.me/${waDigits(phone)}?text=${encodeURIComponent(message)}`;
}

/**
 * Stable fingerprint of a message, used to spot an accidental duplicate send.
 * Deliberately includes the body: re-sending the *same* credentials to the
 * same number is a duplicate, sending updated credentials is not.
 */
export function dedupeHash(parts: { kind: string; phone: string; productId?: string | null; body: string }): string {
  return createHash("sha256")
    .update([parts.kind, parts.phone, parts.productId || "", parts.body].join("|"))
    .digest("hex");
}

/** Format a YYYY-MM-DD (or ISO) date the way customers read it. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return "";
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(d);
}
