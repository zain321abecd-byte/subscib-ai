"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { updateOrderNotes, updateOrderStatus } from "../actions";
import type { OrderRow } from "@/lib/supabase/types";

const STATUS_OPTIONS: OrderRow["status"][] = ["pending", "paid", "delivered", "failed", "refunded", "cancelled"];

export default function OrderControls({
  order,
  canSendDelivery = false,
  deliveriesSent = 0,
}: {
  order: OrderRow;
  /** Whether this teammate holds delivery:send — hides the shortcut if not. */
  canSendDelivery?: boolean;
  /** How many delivery messages are already logged against this order. */
  deliveriesSent?: number;
}) {
  const [status, setStatus] = useState<OrderRow["status"]>(order.status);
  const [notes, setNotes] = useState(order.notes ?? "");
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function flash(setter: typeof setMsg, text: string) {
    setter(text);
    setTimeout(() => setter(null), 2500);
  }

  function saveStatus(newStatus: OrderRow["status"]) {
    setErr(null); setMsg(null);
    setStatus(newStatus);
    const fd = new FormData();
    fd.set("id", order.id);
    fd.set("status", newStatus);
    startTransition(async () => {
      const r = await updateOrderStatus(fd);
      if ("error" in r) setErr(r.error); else flash(setMsg, "Status updated");
    });
  }

  function saveNotes() {
    setErr(null); setMsg(null);
    const fd = new FormData();
    fd.set("id", order.id);
    fd.set("notes", notes);
    startTransition(async () => {
      const r = await updateOrderNotes(fd);
      if ("error" in r) setErr(r.error); else flash(setMsg, "Notes saved");
    });
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="admin-card">
        <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "1rem", color: "var(--text)", margin: "0 0 12px" }}>Status</h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => saveStatus(s)}
              disabled={pending || status === s}
              className={`admin-btn ${status === s ? "admin-btn-primary" : "admin-btn-ghost"}`}
              style={{ padding: "6px 12px", textTransform: "capitalize" }}
            >
              {s}
            </button>
          ))}
        </div>
        <p className="admin-help" style={{ marginTop: 10 }}>Setting status to &quot;Delivered&quot; stamps the delivery time automatically.</p>
      </div>

      {canSendDelivery && (
        <div className="admin-card">
          <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "1rem", color: "var(--text)", margin: "0 0 12px" }}>
            Delivery message
          </h3>
          <p className="admin-help" style={{ marginTop: 0 }}>
            {status === "delivered"
              ? "Send this customer their credentials on WhatsApp — the composer opens pre-filled with their details and this order's subscription."
              : "Mark the order delivered, then send the credentials on WhatsApp. The composer opens pre-filled either way."}
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
            <Link
              href={`/admin/delivery?order=${order.id}`}
              className={`admin-btn ${status === "delivered" ? "admin-btn-primary" : "admin-btn-ghost"}`}
            >
              <i className="fa-brands fa-whatsapp" style={{ marginRight: 6 }} />
              Send delivery message
            </Link>
            {deliveriesSent > 0 && (
              <Link href={`/admin/delivery/history?order=${order.id}`} className="admin-btn admin-btn-ghost">
                <i className="fa-solid fa-clock-rotate-left" style={{ marginRight: 6 }} />
                {deliveriesSent} already sent
              </Link>
            )}
          </div>
        </div>
      )}

      <div className="admin-card">
        <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "1rem", color: "var(--text)", margin: "0 0 12px" }}>Internal notes</h3>
        <textarea
          className="admin-textarea"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anything you need to remember about this order. Customer never sees this."
        />
        <div className="admin-form-actions" style={{ marginTop: 10 }}>
          <button type="button" onClick={saveNotes} className="admin-btn admin-btn-primary" disabled={pending}>
            {pending ? "Saving…" : "Save notes"}
          </button>
        </div>
      </div>

      {(msg || err) && (
        <div
          className="admin-card"
          style={{
            background: err ? "rgba(239,68,68,0.10)" : "rgba(34,197,94,0.10)",
            borderColor: err ? "rgba(239,68,68,0.30)" : "rgba(34,197,94,0.30)",
            color: err ? "#fca5a5" : "#86efac",
            padding: "10px 14px",
          }}
        >
          {err || msg}
        </div>
      )}
    </div>
  );
}
