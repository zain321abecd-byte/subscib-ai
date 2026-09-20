/**
 * Account Book — shared types and pure helpers.
 *
 * Two ledgers: what the business owes vendors (payables) and what customers
 * owe the business (receivables). Status is derived in the database by
 * trigger, never typed, so it can't disagree with the amounts.
 *
 * Client-safe: no server-only imports.
 */

export type AccountStatus = "pending" | "partial" | "paid";

export const ACCOUNT_STATUS_LABELS: Record<AccountStatus, string> = {
  pending: "Pending",
  partial: "Partial",
  paid: "Paid",
};

export interface VendorPayableRow {
  id: string;
  vendor_name: string;
  vendor_contact: string | null;
  description: string | null;
  amount: number;
  paid_amount: number;
  currency: string;
  due_date: string | null;
  status: AccountStatus;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerReceivableRow {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  product_name: string | null;
  invoice_no: string | null;
  amount: number;
  received_amount: number;
  currency: string;
  due_date: string | null;
  status: AccountStatus;
  notes: string | null;
  sale_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** What's still owed on a row. Never negative, even if overpaid. */
export function outstanding(total: number | null, settled: number | null): number {
  return Math.max(0, Number(total ?? 0) - Number(settled ?? 0));
}

/**
 * The summary cards. Only unsettled money counts toward the totals — a fully
 * paid invoice isn't a receivable any more.
 */
export function accountSummary(
  payables: Array<Pick<VendorPayableRow, "amount" | "paid_amount">>,
  receivables: Array<Pick<CustomerReceivableRow, "amount" | "received_amount">>,
): { totalPayable: number; totalReceivable: number; netBalance: number } {
  const totalPayable = payables.reduce((sum, p) => sum + outstanding(p.amount, p.paid_amount), 0);
  const totalReceivable = receivables.reduce((sum, r) => sum + outstanding(r.amount, r.received_amount), 0);
  // Positive means more is coming in than going out.
  return { totalPayable, totalReceivable, netBalance: totalReceivable - totalPayable };
}

export function fmtAmount(value: number | null | undefined, currency = "PKR"): string {
  return `${Number(value ?? 0).toLocaleString("en-PK")} ${currency}`;
}

/** Overdue = unsettled and past its due date. */
export function isOverdue(dueDate: string | null, status: AccountStatus): boolean {
  if (!dueDate || status === "paid") return false;
  return dueDate < new Date().toISOString().slice(0, 10);
}
