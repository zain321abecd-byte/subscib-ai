"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/browser";
import StatusPill from "./StatusPill";
import type { OrderRow } from "@/lib/supabase/types";

function fmtPKR(n: number | null | undefined) {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", maximumFractionDigits: 0 }).format(Number(n));
}

function fmtRelative(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function RealtimeOrders({ initial }: { initial: OrderRow[] }) {
  const [orders, setOrders] = useState<OrderRow[]>(initial);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    const channel = supabase
      .channel("orders-feed")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        (payload: any) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new as OrderRow;
            setOrders((curr) => [row, ...curr.filter((o) => o.id !== row.id)].slice(0, 15));
          } else if (payload.eventType === "UPDATE") {
            const row = payload.new as OrderRow;
            setOrders((curr) => curr.map((o) => (o.id === row.id ? row : o)));
          } else if (payload.eventType === "DELETE") {
            const row = payload.old as Partial<OrderRow>;
            setOrders((curr) => curr.filter((o) => o.id !== row.id));
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (orders.length === 0) {
    return (
      <div className="admin-empty">
        <i className="fa-solid fa-inbox"></i>
        <div>No orders yet. New orders will appear here in real time.</div>
      </div>
    );
  }

  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Order #</th>
            <th>Customer</th>
            <th>Items</th>
            <th>Total</th>
            <th>Status</th>
            <th>When</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id}>
              <td><code>{o.order_number}</code></td>
              <td>{o.customer_email}</td>
              <td>{Array.isArray(o.items) ? o.items.reduce((s, i: any) => s + Number(i.qty || 1), 0) : 0}</td>
              <td>{fmtPKR(o.subtotal_pkr ?? Number(o.subtotal_usd))}</td>
              <td><StatusPill status={o.status} /></td>
              <td>{fmtRelative(o.created_at)}</td>
              <td><Link href={`/admin/orders/${o.id}`} className="admin-btn admin-btn-ghost" style={{ padding: "6px 12px" }}>Open</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
