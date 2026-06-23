"use client";

import { useEffect } from "react";
import { useCart } from "@/lib/cart";

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
    if (orderId) cart.updateOrderStatus(orderId, "paid");
    if (cart.items.length > 0) cart.clear();
  }, [cart, status, orderId]);

  return null;
}
