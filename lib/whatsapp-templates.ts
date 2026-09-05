/**
 * Quick-send WhatsApp templates for the counter.
 *
 * Everything here is plain data and pure functions — no dependencies, no
 * network, nothing server-only — so the send screen can render a live preview
 * as the staff member types.
 *
 * ADDING A TEMPLATE IS A ONE-LINE CHANGE: append an entry to
 * WHATSAPP_TEMPLATES. Any `{token}` in the body is discovered at runtime and
 * gets its own input on the screen, so no UI edits are needed for new
 * placeholders either.
 *
 * Distinct from lib/delivery.ts, which drives the DB-backed delivery
 * automation (logged sends, Meta templates, permissions). This module is the
 * no-backend path: build a message, open wa.me, a human presses send.
 */

export interface WhatsAppTemplate {
  /** Stable key used as the select value. */
  id: string;
  /** Shown in the template dropdown. */
  name: string;
  /** Message text. `{token}` anywhere becomes a generated input. */
  body: string;
}

export const WHATSAPP_TEMPLATES: WhatsAppTemplate[] = [
  {
    id: "order-ready",
    name: "Order ready",
    body:
      "Hi {name}, your {product} order is ready.\n\n" +
      "We've sent the details to your email. If anything doesn't work, reply here and we'll sort it out.\n\n" +
      "Thanks for choosing SubscribAI.",
  },
  {
    id: "payment-received",
    name: "Payment received",
    body:
      "Hi {name}, we've received your payment of {amount} for order {order}.\n\n" +
      "We're setting up your {product} now and will message you as soon as it's ready.",
  },
  {
    id: "awaiting-payment",
    name: "Awaiting payment",
    body:
      "Hi {name}, we haven't seen the payment for order {order} yet.\n\n" +
      "Once it lands we'll activate your {product} straight away. Reply here if you'd like a different payment method.",
  },
  {
    id: "renewal-due",
    name: "Renewal due",
    body:
      "Hi {name}, your {product} subscription is due for renewal on {date}.\n\n" +
      "Renew before then to keep your access running without a break. Reply here and we'll take care of it.",
  },
  {
    id: "follow-up",
    name: "Follow up",
    body:
      "Hi {name}, just checking in on your {product} subscription.\n\n" +
      "Everything working as expected? Reply here if you need anything.",
  },
];

/**
 * Placeholder syntax: a single-brace `{token}`. Kept deliberately narrow
 * (letters, digits, underscore) so ordinary braces in a message aren't
 * mistaken for a field.
 */
const PLACEHOLDER = /\{\s*([a-zA-Z0-9_]+)\s*\}/g;

/** Distinct placeholder tokens, in the order they first appear in the body. */
export function extractPlaceholders(body: string): string[] {
  const seen: string[] = [];
  for (const match of (body ?? "").matchAll(PLACEHOLDER)) {
    const token = match[1];
    if (!seen.includes(token)) seen.push(token);
  }
  return seen;
}

/**
 * Substitute the collected values. An empty field renders as an empty string
 * rather than leaving `{name}` visible to the customer — the preview shows
 * exactly what will be sent, gaps included.
 */
export function fillTemplate(body: string, values: Record<string, string>): string {
  return (body ?? "").replace(PLACEHOLDER, (_match, token: string) => (values[token] ?? "").trim());
}

/** `customer_name` → "Customer name". Used to label a generated input. */
export function humanizePlaceholder(token: string): string {
  const spaced = token.replace(/[_-]+/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}

export interface CountryCode {
  /** ISO 3166-1 alpha-2, used as the select value. */
  iso: string;
  /** Dial code, digits only, no plus. */
  dial: string;
  label: string;
}

/**
 * Short list rather than every country — these cover where this shop's
 * customers actually are. Pakistan first because it's the home market.
 */
export const COUNTRY_CODES: CountryCode[] = [
  { iso: "PK", dial: "92",  label: "Pakistan (+92)" },
  { iso: "AE", dial: "971", label: "United Arab Emirates (+971)" },
  { iso: "SA", dial: "966", label: "Saudi Arabia (+966)" },
  { iso: "GB", dial: "44",  label: "United Kingdom (+44)" },
  { iso: "US", dial: "1",   label: "United States (+1)" },
  { iso: "CA", dial: "1",   label: "Canada (+1)" },
  { iso: "AU", dial: "61",  label: "Australia (+61)" },
  { iso: "QA", dial: "974", label: "Qatar (+974)" },
  { iso: "OM", dial: "968", label: "Oman (+968)" },
  { iso: "MY", dial: "60",  label: "Malaysia (+60)" },
  { iso: "IN", dial: "91",  label: "India (+91)" },
];

export const DEFAULT_COUNTRY_ISO = "PK";

/** Shortest national number we'll accept once stripped. */
const MIN_NATIONAL_DIGITS = 6;

export interface WaNumber {
  /** `countrycode + number`, digits only — what wa.me expects. Empty if invalid. */
  digits: string;
  /** Sentence-case reason the number was rejected, or null when it's usable. */
  error: string | null;
}

/**
 * Build the wa.me number: strip everything non-numeric, drop leading zeros
 * (a trunk prefix like 0300 must not survive into an international number),
 * then concatenate dial code + national number with no plus and no spaces.
 *
 * The 6-digit floor is applied to the national part the person typed, not the
 * combined string — "+1 2345" would otherwise pass on the strength of its
 * country code while being unusable.
 */
export function buildWaNumber(dial: string, national: string): WaNumber {
  const dialDigits = (dial ?? "").replace(/\D+/g, "");
  const nationalDigits = (national ?? "").replace(/\D+/g, "").replace(/^0+/, "");

  if (!nationalDigits) {
    return { digits: "", error: "Enter the customer's number." };
  }
  if (nationalDigits.length < MIN_NATIONAL_DIGITS) {
    return {
      digits: "",
      error: `That number is too short — it needs at least ${MIN_NATIONAL_DIGITS} digits.`,
    };
  }
  if (!dialDigits) {
    return { digits: "", error: "Choose the country code." };
  }
  return { digits: `${dialDigits}${nationalDigits}`, error: null };
}

/**
 * Split a stored international number (e.g. "+923001234567") back into a
 * country selection and a national part, so picking a customer can populate
 * both controls. Longest dial code wins. Returns null when nothing matches —
 * the caller then leaves the country as-is and fills the digits it has.
 */
export function splitInternational(phone: string | null | undefined): { iso: string; national: string } | null {
  const digits = (phone ?? "").replace(/\D+/g, "");
  if (!digits) return null;

  const byLength = [...COUNTRY_CODES].sort((a, b) => b.dial.length - a.dial.length);
  for (const country of byLength) {
    if (digits.length > country.dial.length && digits.startsWith(country.dial)) {
      return { iso: country.iso, national: digits.slice(country.dial.length) };
    }
  }
  return null;
}

/** The link WhatsApp opens with the message already typed. */
export function waHref(digits: string, message: string): string {
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

/**
 * Fill placeholders from a picked customer where the token obviously refers to
 * a field we hold. Anything unrecognised is left for the staff member to type,
 * and an existing value is never overwritten by a blank.
 */
export interface PickableCustomer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  product: string | null;
  orderNumber: string | null;
  /** Shown as the second line in the picker. */
  hint: string;
}

const FIELD_ALIASES: Record<string, (c: PickableCustomer) => string | null> = {
  name: (c) => c.name,
  customer: (c) => c.name,
  customer_name: (c) => c.name,
  nombre: (c) => c.name,
  product: (c) => c.product,
  subscription: (c) => c.product,
  plan: (c) => c.product,
  order: (c) => c.orderNumber,
  order_number: (c) => c.orderNumber,
  pedido: (c) => c.orderNumber,
  email: (c) => c.email,
  phone: (c) => c.phone,
};

/** Values a picked customer can contribute for the given placeholder tokens. */
export function valuesFromCustomer(tokens: string[], customer: PickableCustomer): Record<string, string> {
  const out: Record<string, string> = {};
  for (const token of tokens) {
    const resolve = FIELD_ALIASES[token.toLowerCase()];
    const value = resolve ? resolve(customer) : null;
    if (value) out[token] = value;
  }
  return out;
}
