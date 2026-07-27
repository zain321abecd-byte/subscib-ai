"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type CartItem = {
  id: string;
  name: string;
  price: number;
  qty: number;
  thumbClass?: string;
  iconClass?: string;
  variation?: {
    plan?: string;
    accountType?: "private" | "shared" | "bundle";
    accountLabel?: string;
    duration?: string;
    summary?: string;
    bundle?: {
      key: "creator" | "growth";
      name: string;
      billingCycle: "monthly" | "yearly";
      selectedTools: string[];
      toolLimit: number;
    };
    pricingPlan?: {
      planId: string;
      slug: string;
      name: string;
      billingCycle: "monthly" | "yearly";
      currency: string;
    };
  };
};

export type Order = {
  orderId: string;
  placedAt: number;
  items: CartItem[];
  subtotalUsd: number;
  pkrTotal: number;
  paymentProvider: "payfast" | "jazzcash" | "easypaisa" | "card";
  status: "pending" | "paid" | "failed";
};

/** Applied promo code — validated server-side via lib/coupon-actions.ts. */
export type AppliedCoupon = {
  code: string;
  discountType: "percent" | "fixed";
  value: number;
};

type CartCtx = {
  items: CartItem[];
  count: number;
  subtotal: number;
  /** PKR discount from the applied coupon (0 when none). */
  discount: number;
  /** subtotal - discount — what the shopper actually pays. */
  total: number;
  coupon: AppliedCoupon | null;
  applyCoupon: (coupon: AppliedCoupon) => void;
  removeCoupon: () => void;
  add: (item: Omit<CartItem, "qty"> & { qty?: number }) => void;
  remove: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
  recordOrder: (order: Order) => void;
  updateOrderStatus: (orderId: string, status: Order["status"]) => void;
  orders: Order[];
  ready: boolean;
};

const Ctx = createContext<CartCtx | null>(null);
const STORAGE_KEY = "subscribai-cart";
const ORDERS_KEY = "subscribai-orders";
const COUPON_KEY = "subscribai-coupon";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
      const ordersRaw = localStorage.getItem(ORDERS_KEY);
      if (ordersRaw) setOrders(JSON.parse(ordersRaw));
      const couponRaw = localStorage.getItem(COUPON_KEY);
      if (couponRaw) setCoupon(JSON.parse(couponRaw));
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch {}
  }, [items, ready]);

  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(ORDERS_KEY, JSON.stringify(orders)); } catch {}
  }, [orders, ready]);

  useEffect(() => {
    if (!ready) return;
    try {
      if (coupon) localStorage.setItem(COUPON_KEY, JSON.stringify(coupon));
      else localStorage.removeItem(COUPON_KEY);
    } catch {}
  }, [coupon, ready]);

  const count = items.reduce((n, i) => n + (i.qty || 1), 0);
  const subtotal = items.reduce((n, i) => n + (i.price * (i.qty || 1)), 0);
  const discount = coupon
    ? Math.min(
        subtotal,
        Math.round(coupon.discountType === "percent" ? (subtotal * coupon.value) / 100 : coupon.value),
      )
    : 0;
  const total = Math.max(0, subtotal - discount);

  const value: CartCtx = {
    items, count, subtotal, discount, total, coupon, orders, ready,
    applyCoupon: (c) => setCoupon(c),
    removeCoupon: () => setCoupon(null),
    add: (item) => setItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) return prev.map((i) => i.id === item.id ? { ...i, qty: (i.qty || 1) + (item.qty || 1) } : i);
      return [...prev, { ...item, qty: item.qty || 1 }];
    }),
    remove: (id) => setItems((prev) => prev.filter((i) => i.id !== id)),
    setQty: (id, qty) => setItems((prev) => qty <= 0
      ? prev.filter((i) => i.id !== id)
      : prev.map((i) => i.id === id ? { ...i, qty } : i)),
    clear: () => { setItems([]); setCoupon(null); },
    recordOrder: (order) => setOrders((prev) => {
      // De-dup if the same orderId is recorded twice (e.g. polling re-fires)
      const without = prev.filter((o) => o.orderId !== order.orderId);
      return [order, ...without].slice(0, 50); // keep last 50
    }),
    updateOrderStatus: (orderId, status) => setOrders((prev) =>
      prev.map((o) => o.orderId === orderId ? { ...o, status } : o)
    ),
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
