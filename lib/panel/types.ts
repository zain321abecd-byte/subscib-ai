/** Row shapes for the panel_* tables. Kept in one place so pages and actions
 *  can't drift from each other. */

export type PanelRole = "user" | "admin";
export type OrderStatus =
  | "pending" | "processing" | "in_progress" | "completed" | "partial" | "cancelled" | "failed";
export type PaymentStatus = "pending" | "approved" | "rejected";
export type TicketStatus = "open" | "answered" | "closed";
export type Platform =
  | "instagram" | "tiktok" | "youtube" | "facebook" | "twitter" | "telegram" | "spotify" | "other";

/**
 * A panel profile. `user_id` is the shop account id from public.users — there
 * is no separate panel account, so name and email are read from the shop
 * record rather than duplicated here.
 */
export interface PanelProfile {
  user_id: string;
  role: PanelRole;
  status: "active" | "suspended";
  api_key: string | null;
  created_at: string;
}

export interface PanelWallet {
  user_id: string;
  balance: number;
  currency: string;
}

export interface WalletTransaction {
  id: string;
  user_id: string;
  type: "credit" | "debit";
  amount: number;
  balance_after: number;
  reference: string | null;
  note: string | null;
  created_at: string;
}

export interface ServiceCategory {
  id: string;
  name: string;
  platform: Platform;
  sort_order: number;
  active: boolean;
}

export interface Service {
  id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  rate_per_1000: number;
  min_quantity: number;
  max_quantity: number;
  speed: string | null;
  active: boolean;
  sort_order: number;
  provider_id: string | null;
  provider_service_id: string | null;
  provider_rate: number | null;
}

export interface Provider {
  id: string;
  name: string;
  api_url: string;
  balance: number | null;
  currency: string;
  active: boolean;
  last_synced_at: string | null;
  last_error: string | null;
  created_at: string;
}

export interface Order {
  id: string;
  user_id: string;
  service_id: string | null;
  service_name: string;
  rate_per_1000: number;
  link: string;
  quantity: number;
  charge: number;
  status: OrderStatus;
  start_count: number | null;
  remains: number | null;
  provider_id: string | null;
  provider_order_id: string | null;
  provider_status: string | null;
  note: string | null;
  refunded_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentRequest {
  id: string;
  user_id: string;
  amount: number;
  method: string;
  reference: string | null;
  note: string | null;
  status: PaymentStatus;
  admin_note: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface Ticket {
  id: string;
  user_id: string;
  subject: string;
  status: TicketStatus;
  order_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  author_id: string | null;
  is_staff: boolean;
  body: string;
  created_at: string;
}

/** What a given quantity of a service costs. Rounded to 2dp so the charge, the
 *  ledger and the invoice always agree to the paisa. */
export function calculateCharge(ratePer1000: number, quantity: number): number {
  return Math.round((Number(ratePer1000) * Number(quantity)) / 1000 * 100) / 100;
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  processing: "Processing",
  in_progress: "In progress",
  completed: "Completed",
  partial: "Partial",
  cancelled: "Cancelled",
  failed: "Failed",
};

/** Terminal states that free an order to be refunded. */
export const REFUNDABLE_STATUSES: OrderStatus[] = ["cancelled", "failed"];

export const PLATFORM_LABELS: Record<Platform, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  facebook: "Facebook",
  twitter: "Twitter / X",
  telegram: "Telegram",
  spotify: "Spotify",
  other: "Other",
};
