/**
 * GA4 ecommerce events.
 *
 * Prices across the store are canonical PKR, so every event reports
 * currency: "PKR". GA4's recommended-event names are used verbatim
 * (view_item / add_to_cart / begin_checkout / purchase) so the standard
 * Monetisation reports and funnels populate without custom definitions.
 *
 * All helpers no-op when gtag is absent (analytics disabled, consent
 * denied, or an ad blocker) — tracking must never break a purchase.
 */

export type AnalyticsItem = {
  item_id: string;
  item_name: string;
  price: number;
  quantity: number;
  item_variant?: string;
  item_category?: string;
};

type GtagFn = (...args: unknown[]) => void;

function gtag(): GtagFn | null {
  if (typeof window === "undefined") return null;
  const fn = (window as unknown as { gtag?: GtagFn }).gtag;
  return typeof fn === "function" ? fn : null;
}

function send(event: string, params: Record<string, unknown>): void {
  try {
    gtag()?.("event", event, { currency: "PKR", ...params });
  } catch {
    // Never let analytics throw into checkout.
  }
}

/** Product detail page opened. */
export function trackViewItem(item: AnalyticsItem): void {
  send("view_item", { value: item.price * item.quantity, items: [item] });
}

/** Item added to the cart. */
export function trackAddToCart(item: AnalyticsItem): void {
  send("add_to_cart", { value: item.price * item.quantity, items: [item] });
}

/** Checkout page reached with a non-empty cart. */
export function trackBeginCheckout(items: AnalyticsItem[], value: number): void {
  if (items.length === 0) return;
  send("begin_checkout", { value, items });
}

/** Payment confirmed — the revenue event behind GA4's Monetisation reports. */
export function trackPurchase(
  transactionId: string,
  items: AnalyticsItem[],
  value: number,
): void {
  send("purchase", { transaction_id: transactionId, value, items });
}
