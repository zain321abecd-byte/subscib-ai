/**
 * Product Request Form System — shared types and pure helpers.
 *
 * Used by the public form page, the submit endpoint, and both admin screens.
 * Client-safe: no server-only imports.
 */

export type ProductFormType = "subscription" | "digital" | "service";
export type PlanDuration = "monthly" | "quarterly" | "half_yearly" | "yearly" | "one_time";
export type SaleRequestStatus = "pending" | "accepted" | "declined";

export const PRODUCT_FORM_TYPES: ReadonlyArray<{ value: ProductFormType; label: string }> = [
  { value: "subscription", label: "Subscription" },
  { value: "digital", label: "Digital product" },
  { value: "service", label: "Service" },
];

export const PLAN_DURATIONS: ReadonlyArray<{ value: PlanDuration; label: string; months: number }> = [
  { value: "monthly", label: "Monthly", months: 1 },
  { value: "quarterly", label: "Quarterly (3 months)", months: 3 },
  { value: "half_yearly", label: "Half-yearly (6 months)", months: 6 },
  { value: "yearly", label: "Yearly", months: 12 },
  { value: "one_time", label: "One-time (no renewal)", months: 0 },
];

export const REQUEST_STATUS_LABELS: Record<SaleRequestStatus, string> = {
  pending: "Pending approval",
  accepted: "Accepted",
  declined: "Declined",
};

export function durationLabel(value: string | null | undefined): string {
  return PLAN_DURATIONS.find((d) => d.value === value)?.label || "—";
}

export function durationMonths(value: string | null | undefined): number {
  return PLAN_DURATIONS.find((d) => d.value === value)?.months ?? 1;
}

export function productTypeLabel(value: string | null | undefined): string {
  return PRODUCT_FORM_TYPES.find((t) => t.value === value)?.label || "—";
}

export interface ProductFormRow {
  id: string;
  slug: string;
  name: string;
  product_type: ProductFormType;
  product_id: string | null;
  product_name: string;
  plan_duration: PlanDuration;
  renewal_note: string | null;
  price: number | null;
  currency: string;
  intro: string | null;
  active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SaleRequestRow {
  id: string;
  request_no: string | null;
  form_id: string | null;
  form_name: string | null;
  product_id: string | null;
  product_name: string;
  plan_duration: PlanDuration | null;
  plan_label: string | null;
  price: number | null;
  currency: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  status: SaleRequestStatus;
  decline_reason: string | null;
  sale_id: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

/** URL-safe slug from a form name. Matches the DB's slug CHECK constraint. */
export function slugifyFormName(value: string): string {
  return (value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function isValidSlug(value: string): boolean {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(value) && value.length <= 60;
}

/** The public link for a form. `origin` comes from the caller (SITE_URL). */
export function formUrl(origin: string, slug: string): string {
  return `${(origin || "").replace(/\/+$/, "")}/forms/${slug}`;
}

/** `500 PKR / Month` style price line shown to the customer. */
export function priceLabel(price: number | null, currency: string, duration: string | null): string {
  if (price == null) return "Price on request";
  const amount = `${Number(price).toLocaleString("en-PK")} ${currency || "PKR"}`;
  switch (duration) {
    case "monthly": return `${amount} / month`;
    case "quarterly": return `${amount} / 3 months`;
    case "half_yearly": return `${amount} / 6 months`;
    case "yearly": return `${amount} / year`;
    default: return amount;
  }
}

/** "Monthly · Monthly Renewable" — the snapshot stored on a request. */
export function planLabel(duration: string | null, renewalNote: string | null): string {
  return [durationLabel(duration), renewalNote?.trim()].filter(Boolean).join(" · ");
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Add whole months to a YYYY-MM-DD date, clamping to the end of the target
 * month so 31 Jan + 1 month is 28/29 Feb rather than rolling into March.
 */
export function addMonthsIso(iso: string, months: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, lastDay));
  return target.toISOString().slice(0, 10);
}

/**
 * Dates for the sale created when a request is accepted.
 *
 * subscription_sales requires expiry_date and renew_date, so they're derived
 * from the form's duration. A one-time product has no next cycle: both dates
 * become the sale date and the caller marks the sale terminal, which keeps it
 * out of the renewal-reminder sweep instead of nagging a customer about a
 * subscription they never bought.
 */
export function saleDatesFor(duration: string | null, saleDate = todayIso()): {
  sale_date: string;
  expiry_date: string;
  renew_date: string;
  recurring: boolean;
} {
  const months = durationMonths(duration);
  if (months <= 0) {
    return { sale_date: saleDate, expiry_date: saleDate, renew_date: saleDate, recurring: false };
  }
  const end = addMonthsIso(saleDate, months);
  return { sale_date: saleDate, expiry_date: end, renew_date: end, recurring: true };
}

/** Digits-only phone check, tolerant of spaces/dashes. Min 7 digits. */
export function isPlausiblePhone(value: string): boolean {
  return (value || "").replace(/\D+/g, "").length >= 7;
}

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((value || "").trim());
}
