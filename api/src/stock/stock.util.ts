import type { StockFormInput, StockItemRow, StockItemWithComputed, StockStatus } from "./stock.types";

// Ported from the Next.js app (lib/stock.ts). Pure functions, no framework deps.

export const STOCK_STATUSES: StockStatus[] = ["active", "expiringSoon", "expired", "renewed"];

export const STOCK_STATUS_LABELS: Record<StockStatus, string> = {
  active: "Active",
  expiringSoon: "Expiring Soon",
  expired: "Expired",
  renewed: "Renewed",
};

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function daysLeft(expiryDate: string, now = new Date()) {
  const expiry = new Date(`${expiryDate}T00:00:00`);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);
  return Math.ceil((expiry.getTime() - today.getTime()) / 86_400_000);
}

export function deriveStockStatus(
  expiryDate: string,
  reminderDaysBeforeExpiry: number,
  currentStatus?: StockStatus | null,
  now = new Date(),
): StockStatus {
  if (currentStatus === "renewed") return "renewed";
  const left = daysLeft(expiryDate, now);
  if (left < 0) return "expired";
  if (left <= reminderDaysBeforeExpiry) return "expiringSoon";
  return "active";
}

export function normalizeStockItem(row: StockItemRow, now = new Date()): StockItemWithComputed {
  const left = daysLeft(row.expiry_date, now);
  return {
    ...row,
    days_left: left,
    computed_status: deriveStockStatus(row.expiry_date, row.reminder_days_before_expiry, row.status, now),
  };
}

export function stockMutationStatus(expiryDate: string, reminderDaysBeforeExpiry: number) {
  return deriveStockStatus(expiryDate, reminderDaysBeforeExpiry, null);
}

/** Normalise a loose request body (camelCase or snake_case) into a StockFormInput. */
export function bodyToStockInput(body: any, existing?: StockItemRow): StockFormInput {
  const quantity = Number(body?.quantity ?? existing?.quantity);
  const reminderDaysBeforeExpiry = Number(
    body?.reminderDaysBeforeExpiry ?? body?.reminder_days_before_expiry ?? existing?.reminder_days_before_expiry ?? 7,
  );
  const pick = (camel: any, snake: any, fallback: any) =>
    camel !== undefined ? camel : snake !== undefined ? snake : fallback;

  return {
    item_name: String(body?.itemName ?? body?.item_name ?? existing?.item_name ?? "").trim(),
    category: body?.category !== undefined ? String(body.category || "").trim() || null : existing?.category ?? null,
    quantity,
    unit: body?.unit !== undefined ? String(body.unit || "").trim() || null : existing?.unit ?? null,
    expiry_date: String(body?.expiryDate ?? body?.expiry_date ?? existing?.expiry_date ?? "").trim(),
    reminder_days_before_expiry: Number.isFinite(reminderDaysBeforeExpiry)
      ? Math.max(0, Math.floor(reminderDaysBeforeExpiry))
      : 7,
    contact_email: String(body?.contactEmail ?? body?.contact_email ?? existing?.contact_email ?? "").trim().toLowerCase(),
    supplier_name:
      body?.supplierName !== undefined || body?.supplier_name !== undefined
        ? String(pick(body?.supplierName, body?.supplier_name, "")).trim() || null
        : existing?.supplier_name ?? null,
    status: "active",
    notes: body?.notes !== undefined ? String(body.notes || "").trim() || null : existing?.notes ?? null,
  };
}

export function validateStockInput(input: StockFormInput): string | null {
  if (!input.item_name) return "Item name is required.";
  if (!Number.isFinite(input.quantity) || input.quantity <= 0) return "Quantity must be a positive number.";
  if (!input.expiry_date) return "Expiry date is required.";
  if (!input.contact_email || !isValidEmail(input.contact_email)) return "A valid contact email is required.";
  if (!Number.isFinite(input.reminder_days_before_expiry) || input.reminder_days_before_expiry < 0) {
    return "Reminder days must be zero or greater.";
  }
  return null;
}

export function toStockInsert(input: StockFormInput) {
  const reminder = input.reminder_days_before_expiry || 7;
  return {
    item_name: input.item_name,
    category: input.category,
    quantity: input.quantity,
    unit: input.unit,
    expiry_date: input.expiry_date,
    reminder_days_before_expiry: reminder,
    contact_email: input.contact_email,
    supplier_name: input.supplier_name,
    status: stockMutationStatus(input.expiry_date, reminder),
    notes: input.notes,
  };
}
