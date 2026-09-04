/**
 * Shared types for the Subscription Delivery Automation feature.
 *
 * Tables: public.message_templates + public.delivery_messages
 * (see supabase/21-delivery-automation.sql).
 */

/** Which automation a template / log row belongs to. */
export type MessageKind = "delivery" | "renewal_reminder" | "expiry_notice";
export const MESSAGE_KINDS: readonly MessageKind[] = ["delivery", "renewal_reminder", "expiry_notice"];

/** How the message left the building. */
export type MessageChannel = "whatsapp" | "manual" | "email";
export const MESSAGE_CHANNELS: readonly MessageChannel[] = ["whatsapp", "manual", "email"];

export type MessageStatus = "pending" | "sent" | "failed";

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

/** The credential / customer fields the composer collects. */
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
  /** Filled in from site_settings when absent. */
  support_email?: string | null;
  support_whatsapp?: string | null;
  brand_name?: string | null;
}

/** Body accepted by POST /delivery/send. */
export interface SendDeliveryInput {
  templateId?: string | null;
  /** Overrides the template body when the admin edited the preview by hand. */
  bodyOverride?: string | null;
  kind?: MessageKind;
  language?: string;
  productId?: string | null;
  productName?: string;
  customerPhone: string;
  customerName?: string | null;
  customerEmail?: string | null;
  /** Also mail the same message to customerEmail. */
  alsoEmail?: boolean;
  variables?: DeliveryVariables;
  orderId?: string | null;
  saleId?: string | null;
  /** Bypass the duplicate guard (admin explicitly confirmed the resend). */
  force?: boolean;
  /** Who pressed send — resolved by the Next.js server action. */
  actor?: { id?: string | null; email?: string | null } | null;
}
