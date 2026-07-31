"use client";

import { useEffect } from "react";
import { useCart } from "@/lib/cart";
import { trackPurchase } from "@/lib/analytics";

/** Marks an order as already reported to GA4, so a refresh can't double-count revenue. */
const PURCHASE_TRACKED_PREFIX = "subscribai_purchase_tracked_";

function alreadyTracked(orderId: string): boolean {
  try {
    return localStorage.getItem(PURCHASE_TRACKED_PREFIX + orderId) === "1";
  } catch {
    return false;
  }
}

function markTracked(orderId: string): void {
  try {
    localStorage.setItem(PURCHASE_TRACKED_PREFIX + orderId, "1");
  } catch {
    // Storage unavailable — worst case the event repeats on a manual refresh.
  }
}

/**
 * Mount on the /thank-you page. When PayFast has returned with status=paid,
 * empty the cart and flip the local order record to "paid" so the customer
 * sees a clean cart icon and the right state in their account history.
 *
 * Safe to mount unconditionally — it only acts when status=paid AND the
 * cart actually has items waiting to clear (idempotent on refresh).
 */
export default function ClearCartOnSuccess({
  status,
  orderId,
}: {
  status: string;
  orderId: string;
}) {
  const cart = useCart();

  useEffect(() => {
    if (!cart.ready) return;
    if (status !== "paid") return;

    // GA4 purchase — read the cart BEFORE clearing it below, and only once
    // per order id so refreshes don't inflate reported revenue.
    if (orderId && cart.items.length > 0 && !alreadyTracked(orderId)) {
      trackPurchase(
        orderId,
        cart.items.map((i) => ({
          item_id: i.id,
          item_name: i.name,
          price: i.price,
          quantity: i.qty || 1,
          item_variant: i.variation?.summary,
        })),
        cart.subtotal,
      );
      markTracked(orderId);
    }

    if (orderId) cart.updateOrderStatus(orderId, "paid");
    if (cart.items.length > 0) cart.clear();
  }, [cart, status, orderId]);

  return null;
}
