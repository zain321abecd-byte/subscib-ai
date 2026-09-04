import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";

/**
 * Shared types + helpers for Subscription Delivery Automation.
 *
 * Mirrors api/src/delivery/{delivery.types,template.util}.ts. The backend is
 * authoritative — it re-renders and re-validates everything at send time.
 * This copy exists so the admin composer can show a live preview and catch a
 * bad phone number without a network round trip per keystroke.
 *
 * Client-safe: no server-only imports.
 */

export type MessageKind = "delivery" | "renewal_reminder" | "expiry_notice";
export type MessageChannel = "whatsapp" | "manual" | "email";
export type MessageStatus = "pending" | "sent" | "failed";

export const MESSAGE_KINDS: readonly MessageKind[] = ["delivery", "renewal_reminder", "expiry_notice"];

export const KIND_LABELS: Record<MessageKind, string> = {
  delivery: "Delivery message",
  renewal_reminder: "Renewal reminder",
  expiry_notice: "Expiry notice",
};

export const LANGUAGES: ReadonlyArray<{ value: string; label: string }> = [
  { value: "en", label: "English" },
  { value: "ur", label: "Urdu" },
];

export function languageLabel(code: string): string {
  return LANGUAGES.find((l) => l.value === code)?.label || code.toUpperCase();
}

export interface MessageTemplateRow {
  id: string;
  name: string;
  kind: MessageKind;
  language: string;
  product_id: string | null;
  body: string;
  active: boolean;
  is_default: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DeliveryMessageRow {
  id: string;
  order_id: string | null;
  sale_id: string | null;
  template_id: string | null;
  template_name: string | null;
  kind: MessageKind;
  language: string;
  customer_name: string | null;
  customer_phone: string;
  customer_email: string | null;
  product_id: string | null;
  product_name: string;
  channel: MessageChannel;
  provider: string | null;
  provider_message_id: string | null;
  message_body: string;
  status: MessageStatus;
  error: string | null;
  dedupe_hash: string | null;
  sent_by: string | null;
  sent_by_email: string | null;
  created_at: string;
  sent_at: string | null;
}

export interface DeliveryVariables {
  customer_name?: string | null;
  subscription_name?: string | null;
  plan_name?: string | null;
  email?: string | null;
  password?: string | null;
  account_details?: string | null;
  start_date?: string | null;
  renewal_date?: string | null;
  expiry_date?: string | null;
  notes?: string | null;
  order_number?: string | null;
  support_email?: string | null;
  support_whatsapp?: string | null;
  brand_name?: string | null;
}

export interface TemplateVariable {
  key: keyof DeliveryVariables & string;
  label: string;
  example: string;
  /** Filled in by the server from site settings — not typed by the admin. */
  auto?: boolean;
}

export const TEMPLATE_VARIABLES: readonly TemplateVariable[] = [
  { key: "customer_name",     label: "Customer name",          example: "Ahmed Raza" },
  { key: "subscription_name", label: "Subscription / product",  example: "ChatGPT Plus" },
  { key: "plan_name",         label: "Plan",                    example: "1 Month · Private" },
  { key: "email",             label: "Login email",             example: "user@example.com" },
  { key: "password",          label: "Password",                example: "Str0ngPass!" },
  { key: "account_details",   label: "Account details",         example: "Profile 2 · PIN 1234" },
  { key: "start_date",        label: "Activation date",         example: "4 Sep 2026" },
  { key: "renewal_date",      label: "Renewal date",            example: "4 Oct 2026" },
  { key: "expiry_date",       label: "Expiry date",             example: "4 Oct 2026" },
  { key: "notes",             label: "Additional notes",        example: "Do not log out." },
  { key: "order_number",      label: "Order number",            example: "SB-10241" },
  { key: "support_email",     label: "Support email",           example: "support@subscribai.com", auto: true },
  { key: "support_whatsapp",  label: "Support WhatsApp",        example: "+92 300 1234567",        auto: true },
  { key: "brand_name",        label: "Business name",           example: "SubscribAI",             auto: true },
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
  missing: string[];
  unknown: string[];
}

/**
 * Substitute variables into a template body.
 *
 * Rules, matched byte-for-byte by renderTemplate() in
 *   api/src/delivery/template.util.ts (the authoritative copy):
 *   - `{{var}}` and `{var}` are both accepted.
 *   - An unknown or empty variable is never shipped to the customer as
 *     literal `{{password}}` text.
 *   - A line that was ONLY placeholders and resolved to nothing is dropped,
 *     and so is the label line above it ("Password:") — otherwise the message
 *     goes out with a heading and a blank space under it.
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

/** Label for a variable key, for the "missing" warnings. */
export function variableLabel(key: string): string {
  return TEMPLATE_VARIABLES.find((v) => v.key === key)?.label || key;
}

/**
 * Validate + normalise a WhatsApp number to E.164. Pakistani numbers may be
 * typed the local way (0300…) — everything else needs its country code.
 */
export function normalizePhone(raw: string | null | undefined, country: CountryCode = "PK"): string | null {
  if (!raw || !String(raw).trim()) return null;
  const parsed = parsePhoneNumberFromString(String(raw).trim(), country);
  return parsed?.isValid() ? parsed.number : null;
}

/** Pretty international form for display, falling back to the raw input. */
export function formatPhone(raw: string | null | undefined, country: CountryCode = "PK"): string {
  if (!raw) return "";
  const parsed = parsePhoneNumberFromString(String(raw).trim(), country);
  return parsed?.isValid() ? parsed.formatInternational() : String(raw);
}

export function waDigits(phone: string): string {
  return (phone || "").replace(/\D+/g, "");
}

export function waLink(phone: string, message: string): string {
  return `https://wa.me/${waDigits(phone)}?text=${encodeURIComponent(message)}`;
}

/** `••••••` stand-in used everywhere a password would otherwise be on screen. */
export function maskSecret(value: string | null | undefined): string {
  if (!value) return "";
  return "•".repeat(Math.min(12, Math.max(6, value.length)));
}

/** Replace every occurrence of `password` in an already-rendered message. */
export function maskPasswordInText(text: string, password: string | null | undefined): string {
  if (!password) return text;
  return text.split(password).join(maskSecret(password));
}

/** Format a YYYY-MM-DD / ISO date the way the templates render it. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return "";
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(d);
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
