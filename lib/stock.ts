import type { StockItemRow, StockStatus } from "@/lib/supabase/types";

export const STOCK_STATUSES: StockStatus[] = ["active", "expiringSoon", "expired", "renewed"];

export const STOCK_STATUS_LABELS: Record<StockStatus, string> = {
  active: "Active",
  expiringSoon: "Expiring Soon",
  expired: "Expired",
  renewed: "Renewed",
};

export type StockItemWithComputed = StockItemRow & {
  days_left: number;
  computed_status: StockStatus;
};

export type StockFormData = {
  item_name: string;
  category: string | null;
  quantity: number;
  unit: string | null;
  expiry_date: string;
  reminder_days_before_expiry: number;
  contact_email: string;
  supplier_name: string | null;
  status: StockStatus;
  notes: string | null;
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

export function parseStockFormData(formData: FormData): StockFormData {
  const str = (name: string) => String(formData.get(name) || "").trim();
  const quantity = Number(str("quantity"));
  const reminderRaw = str("reminder_days_before_expiry") || str("reminderDaysBeforeExpiry");
  const reminderDaysBeforeExpiry = Number(reminderRaw || 7);
  const expiryDate = str("expiry_date") || str("expiryDate");

  return {
    item_name: str("item_name") || str("itemName"),
    category: str("category") || null,
    quantity,
    unit: str("unit") || null,
    expiry_date: expiryDate,
    reminder_days_before_expiry: Number.isFinite(reminderDaysBeforeExpiry)
      ? Math.max(0, Math.floor(reminderDaysBeforeExpiry))
      : 7,
    contact_email: (str("contact_email") || str("contactEmail")).toLowerCase(),
    supplier_name: str("supplier_name") || str("supplierName") || null,
    status: "active",
    notes: str("notes") || null,
  };
}

export function validateStockInput(input: StockFormData): string | null {
  if (!input.item_name) return "Item name is required.";
  if (!Number.isFinite(input.quantity) || input.quantity <= 0) return "Quantity must be a positive number.";
  if (!input.expiry_date) return "Expiry date is required.";
  if (!input.contact_email || !isValidEmail(input.contact_email)) return "A valid contact email is required.";
  if (!Number.isFinite(input.reminder_days_before_expiry) || input.reminder_days_before_expiry < 0) {
    return "Reminder days must be zero or greater.";
  }
  return null;
}

export function toStockInsert(input: StockFormData) {
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

export function formatDaysLeft(days: number) {
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Today";
  if (days === 1) return "1 day";
  return `${days} days`;
}
