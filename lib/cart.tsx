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
    accountType?: "private" | "shared";
    accountLabel?: string;
    duration?: string;
    summary?: string;
  };
};

export type Order = {
  orderId: string;
  placedAt: number;
  items: CartItem[];
  subtotalUsd: number;
  pkrTotal: number;
  paymentProvider: "jazzcash" | "easypaisa" | "card";
  status: "pending" | "paid" | "failed";
};

type CartCtx = {
  items: CartItem[];
  count: number;
  subtotal: number;
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

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
      const ordersRaw = localStorage.getItem(ORDERS_KEY);
      if (ordersRaw) setOrders(JSON.parse(ordersRaw));
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

  const count = items.reduce((n, i) => n + (i.qty || 1), 0);
  const subtotal = items.reduce((n, i) => n + (i.price * (i.qty || 1)), 0);

  const value: CartCtx = {
    items, count, subtotal, orders, ready,
    add: (item) => setItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) return prev.map((i) => i.id === item.id ? { ...i, qty: (i.qty || 1) + (item.qty || 1) } : i);
      return [...prev, { ...item, qty: item.qty || 1 }];
    }),
    remove: (id) => setItems((prev) => prev.filter((i) => i.id !== id)),
    setQty: (id, qty) => setItems((prev) => qty <= 0
      ? prev.filter((i) => i.id !== id)
      : prev.map((i) => i.id === id ? { ...i, qty } : i)),
    clear: () => setItems([]),
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
