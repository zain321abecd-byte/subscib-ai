"use client";

import { useMemo, useState, useTransition } from "react";
import type { OrderRow } from "@/lib/supabase/types";
import { updateBundleOrder } from "./actions";

type FulfillmentStatus = NonNullable<OrderRow["fulfillment_status"]>;

const FULFILLMENT_LABELS: Record<FulfillmentStatus, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  activated: "Activated",
  rejected: "Rejected",
  expired: "Expired",
};

const PAYMENT_LABELS: Record<OrderRow["status"], string> = {
  pending: "Pending",
  paid: "Paid",
  delivered: "Paid",
  failed: "Failed",
  refunded: "Refunded",
  cancelled: "Cancelled",
};

const FULFILLMENT_OPTIONS = Object.keys(FULFILLMENT_LABELS) as FulfillmentStatus[];

function fmtPKR(value: number | null | undefined) {
  if (value == null) return "-";
  return new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", maximumFractionDigits: 0 }).format(Number(value));
}

function fmtDate(value: string) {
  return new Date(value).toLocaleString();
}

function pillClass(status: string) {
  if (status === "paid" || status === "delivered" || status === "activated" || status === "resolved") return "admin-pill-paid";
  if (status === "in_progress" || status === "contacted") return "admin-pill-delivered";
  if (status === "failed" || status === "rejected" || status === "expired") return "admin-pill-failed";
  if (status === "refunded" || status === "cancelled") return "admin-pill-cancelled";
  return "admin-pill-pending";
}

function bundleDetails(order: OrderRow) {
  const items = Array.isArray(order.items) ? order.items : [];
  const bundleItem = items.find((item: any) => item?.variation?.pricingPlan || item?.variation?.bundle) || items[0];
  const pricingPlan = (bundleItem as any)?.variation?.pricingPlan || {};
  const bundle = (bundleItem as any)?.variation?.bundle || {};
  const selectedTools: string[] = Array.isArray(bundle.selectedTools) ? bundle.selectedTools.map(String) : [];
  return {
    bundleName: String(pricingPlan.name || bundle.name || bundleItem?.name || "Plan"),
    billingCycle: String(pricingPlan.billingCycle || bundle.billingCycle || (bundleItem as any)?.variation?.duration || "-"),
    selectedTools,
  };
}

export default function BundleOrdersClient({
  initialOrders,
  canWrite,
}: {
  initialOrders: OrderRow[];
  canWrite: boolean;
}) {
  const [orders, setOrders] = useState(initialOrders);
  const [selectedOrder, setSelectedOrder] = useState<OrderRow | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const liveOrder = useMemo(
    () => orders.find((row) => row.id === selectedOrder?.id) || selectedOrder,
    [orders, selectedOrder],
  );

  function saveOrder(order: OrderRow, fulfillmentStatus: FulfillmentStatus, adminNote: string) {
    setError("");
    startTransition(async () => {
      const result = await updateBundleOrder({ id: order.id, fulfillmentStatus, adminNote });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOrders((current) => current.map((row) => row.id === order.id ? { ...row, fulfillment_status: fulfillmentStatus, notes: adminNote } : row));
      setSelectedOrder((current) => current?.id === order.id ? { ...current, fulfillment_status: fulfillmentStatus, notes: adminNote } : current);
    });
  }

  return (
    <div style={{ display: "grid", gap: 18 }}>
      {error && (
        <div className="admin-card" style={{ background: "rgba(239,68,68,0.10)", borderColor: "rgba(239,68,68,0.30)", color: "#fca5a5" }}>
          {error}
        </div>
      )}

      <section className="admin-card" style={{ padding: 0 }}>
        <div className="admin-section-head" style={{ padding: "16px 16px 0" }}>
          <h3>Bundle Orders</h3>
          <p>Paid checkout orders that include Creator or Growth pricing plans.</p>
        </div>
        {orders.length === 0 ? (
          <div className="admin-empty" style={{ padding: 22 }}>
            <i className="fa-solid fa-box-open"></i>
            <div>No bundle orders yet.</div>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Customer name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Bundle name</th>
                  <th>Billing cycle</th>
                  <th>Plan details</th>
                  <th>Amount</th>
                  <th>Payment status</th>
                  <th>Order status</th>
                  <th>Created date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const details = bundleDetails(order);
                  const fulfillment = order.fulfillment_status || "pending";
                  return (
                    <tr key={order.id}>
                      <td>{order.customer_name || "-"}</td>
                      <td>{order.customer_email}</td>
                      <td>{order.customer_phone || "-"}</td>
                      <td>{details.bundleName}</td>
                      <td style={{ textTransform: "capitalize" }}>{details.billingCycle}</td>
                      <td style={{ maxWidth: 260 }}>{details.selectedTools.join(", ") || `${details.bundleName} plan`}</td>
                      <td>{fmtPKR(order.subtotal_pkr)}</td>
                      <td><span className={`admin-pill ${pillClass(order.status)}`}>{PAYMENT_LABELS[order.status]}</span></td>
                      <td><span className={`admin-pill ${pillClass(fulfillment)}`}>{FULFILLMENT_LABELS[fulfillment]}</span></td>
                      <td style={{ whiteSpace: "nowrap" }}>{fmtDate(order.created_at)}</td>
                      <td>
                        <button type="button" className="admin-btn admin-btn-ghost" style={{ padding: "6px 12px" }} onClick={() => setSelectedOrder(order)}>
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {liveOrder && (
        <BundleOrderModal order={liveOrder} canWrite={canWrite} pending={pending} onClose={() => setSelectedOrder(null)} onSave={saveOrder} />
      )}
    </div>
  );
}

function ModalFrame({ title, subtitle, onClose, children }: { title: string; subtitle: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, zIndex: 80, display: "grid", placeItems: "center", padding: 18, background: "rgba(0,0,0,0.58)" }} onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <div className="admin-card" style={{ width: "min(760px, 100%)", maxHeight: "88vh", overflow: "auto" }}>
        <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", gap: 14, marginBottom: 18 }}>
          <div>
            <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1.2rem", color: "var(--text)", margin: 0 }}>{title}</h2>
            <p style={{ color: "var(--text-muted)", margin: "4px 0 0" }}>{subtitle}</p>
          </div>
          <button type="button" className="admin-btn admin-btn-ghost" style={{ padding: "7px 10px" }} onClick={onClose} aria-label="Close">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function BundleOrderModal({
  order,
  canWrite,
  pending,
  onClose,
  onSave,
}: {
  order: OrderRow;
  canWrite: boolean;
  pending: boolean;
  onClose: () => void;
  onSave: (order: OrderRow, fulfillmentStatus: FulfillmentStatus, adminNote: string) => void;
}) {
  const details = bundleDetails(order);
  const [status, setStatus] = useState<FulfillmentStatus>(order.fulfillment_status || "pending");
  const [note, setNote] = useState(order.notes || "");

  return (
    <ModalFrame title={details.bundleName} subtitle={`${order.customer_name || order.customer_email} · ${fmtDate(order.created_at)}`} onClose={onClose}>
      <div className="admin-row cols-2">
        <Detail label="Email" value={order.customer_email} />
        <Detail label="Phone" value={order.customer_phone || "-"} />
        <Detail label="Billing cycle" value={details.billingCycle} />
        <Detail label="Amount" value={fmtPKR(order.subtotal_pkr)} />
        <Detail label="Payment status" value={PAYMENT_LABELS[order.status]} />
        <Detail label="Order number" value={order.order_number} />
      </div>
      <div style={{ marginTop: 14 }}>
        <span className="admin-label">Plan details</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {details.selectedTools.length > 0
            ? details.selectedTools.map((tool) => <span key={tool} className="admin-pill admin-pill-delivered">{tool}</span>)
            : <span className="admin-pill admin-pill-delivered">{details.bundleName} · {details.billingCycle}</span>}
        </div>
      </div>
      <div className="admin-row cols-2" style={{ marginTop: 14 }}>
        <label>
          <span className="admin-label">Order status</span>
          <select className="admin-select" value={status} onChange={(event) => setStatus(event.target.value as FulfillmentStatus)} disabled={!canWrite}>
            {FULFILLMENT_OPTIONS.map((option) => <option key={option} value={option}>{FULFILLMENT_LABELS[option]}</option>)}
          </select>
        </label>
      </div>
      <div style={{ marginTop: 14 }}>
        <span className="admin-label">Internal note</span>
        <textarea className="admin-textarea" value={note} onChange={(event) => setNote(event.target.value)} disabled={!canWrite} />
      </div>
      {canWrite && (
        <div className="admin-form-actions" style={{ marginTop: 14 }}>
          <button type="button" className="admin-btn admin-btn-primary" disabled={pending} onClick={() => onSave(order, status, note)}>
            {pending ? "Saving..." : "Save changes"}
          </button>
        </div>
      )}
    </ModalFrame>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <span className="admin-label">{label}</span>
      <div style={{ color: "var(--text)" }}>{value}</div>
    </div>
  );
}
