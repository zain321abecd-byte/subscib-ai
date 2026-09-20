"use client";

/**
 * Sale requests — the approval queue for submissions from /forms/<slug>.
 *
 * Accepting creates the Daily Sales row; declining keeps the record with an
 * optional reason so the history of what was turned down survives.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  REQUEST_STATUS_LABELS,
  durationLabel,
  type SaleRequestRow,
  type SaleRequestStatus,
} from "@/lib/product-forms";
import { acceptSaleRequest, declineSaleRequest, reopenSaleRequest } from "./actions";
import {
  ConfirmModal,
  Field,
  IconBtn,
  ModalShell,
  Pill,
  StatCard,
  Td,
  Th,
  flashStyle,
  footerCancelStyle,
  footerPrimaryStyle,
} from "../delivery/ui";

const TABS: Array<{ value: SaleRequestStatus; label: string }> = [
  { value: "pending", label: "Pending" },
  { value: "accepted", label: "Accepted" },
  { value: "declined", label: "Declined" },
];

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

function fmtMoney(price: number | null, currency: string): string {
  if (price == null) return "—";
  return `${Number(price).toLocaleString("en-PK")} ${currency || "PKR"}`;
}

export default function SaleRequestsClient({
  initialRequests,
  canReview,
}: {
  initialRequests: SaleRequestRow[];
  canReview: boolean;
}) {
  const router = useRouter();
  const [requests, setRequests] = useState(initialRequests);
  const [tab, setTab] = useState<SaleRequestStatus>("pending");
  const [search, setSearch] = useState("");
  const [flash, setFlash] = useState<{ kind: "ok" | "err" | "warn"; msg: string } | null>(null);
  const [confirmAccept, setConfirmAccept] = useState<SaleRequestRow | null>(null);
  const [declining, setDeclining] = useState<SaleRequestRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function notify(kind: "ok" | "err" | "warn", msg: string) {
    setFlash({ kind, msg });
    setTimeout(() => setFlash(null), 6000);
  }

  const counts = useMemo(() => {
    let pending = 0, accepted = 0, declined = 0, pendingValue = 0;
    for (const r of requests) {
      if (r.status === "pending") { pending++; pendingValue += Number(r.price ?? 0); }
      if (r.status === "accepted") accepted++;
      if (r.status === "declined") declined++;
    }
    return { pending, accepted, declined, pendingValue };
  }, [requests]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return requests.filter((r) => {
      if (r.status !== tab) return false;
      if (!q) return true;
      const hay = [r.request_no, r.customer_name, r.customer_phone, r.customer_email, r.product_name, r.form_name]
        .filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [requests, tab, search]);

  async function accept(row: SaleRequestRow) {
    setBusyId(row.id);
    const res = await acceptSaleRequest(row.id);
    setBusyId(null);
    if (!res.ok) { notify("err", res.error); return; }
    setRequests((prev) =>
      prev.map((r) => (r.id === row.id ? { ...r, status: "accepted", sale_id: res.data?.saleId ?? null } : r)),
    );
    notify("ok", `${row.request_no ?? "Request"} accepted — the sale is now in Daily Sales.`);
    router.refresh();
  }

  async function decline(row: SaleRequestRow, reason: string) {
    setBusyId(row.id);
    const res = await declineSaleRequest(row.id, reason);
    setBusyId(null);
    if (!res.ok) { notify("err", res.error); return; }
    setRequests((prev) =>
      prev.map((r) => (r.id === row.id ? { ...r, status: "declined", decline_reason: reason || null } : r)),
    );
    notify("ok", `${row.request_no ?? "Request"} declined.`);
    router.refresh();
  }

  async function reopen(row: SaleRequestRow) {
    setBusyId(row.id);
    const res = await reopenSaleRequest(row.id);
    setBusyId(null);
    if (!res.ok) { notify("err", res.error); return; }
    setRequests((prev) =>
      prev.map((r) => (r.id === row.id ? { ...r, status: "pending", decline_reason: null } : r)),
    );
    notify("ok", "Request moved back to pending.");
    router.refresh();
  }

  return (
    <div>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18, gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "1.65rem", margin: "0 0 4px" }}>Sale requests</h1>
          <p style={{ color: "var(--text-muted)", margin: 0, fontSize: "0.92rem" }}>
            Submissions from your product forms. Accepting one records the sale in Daily Sales.
          </p>
        </div>
        <Link href="/admin/product-forms" className="admin-btn admin-btn-ghost">
          <i className="fa-solid fa-link" style={{ marginRight: 6 }} /> Product forms
        </Link>
      </header>

      {flash && <div style={{ ...flashStyle(flash.kind), marginBottom: 14 }}>{flash.msg}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 18 }}>
        <StatCard icon="fa-hourglass-half" tone="warn" label="Pending approval" value={counts.pending} />
        <StatCard icon="fa-circle-check" tone="ok" label="Accepted" value={counts.accepted} />
        <StatCard icon="fa-circle-xmark" tone="danger" label="Declined" value={counts.declined} />
        <StatCard icon="fa-wallet" tone="brand" label="Pending value (PKR)" value={counts.pendingValue.toLocaleString("en-PK")} />
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14, alignItems: "center" }}>
        <div role="tablist" aria-label="Request status" style={{ display: "inline-flex", gap: 6 }}>
          {TABS.map((t) => {
            const active = tab === t.value;
            const n = t.value === "pending" ? counts.pending : t.value === "accepted" ? counts.accepted : counts.declined;
            return (
              <button
                key={t.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.value)}
                className={`admin-btn ${active ? "admin-btn-primary" : "admin-btn-ghost"}`}
                style={{ padding: "8px 14px" }}
              >
                {t.label} <span style={{ opacity: 0.7 }}>({n})</span>
              </button>
            );
          })}
        </div>

        <input
          className="admin-input"
          placeholder="Search request #, customer, phone, product…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search requests"
          style={{ flex: "1 1 260px", minWidth: 200 }}
        />
      </div>

      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        {rows.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-muted)" }}>
            <i className="fa-solid fa-inbox" style={{ fontSize: 28, marginBottom: 10, display: "block" }} />
            <div style={{ fontWeight: 600, color: "var(--text)" }}>
              {search ? "No request matches your search" : `No ${REQUEST_STATUS_LABELS[tab].toLowerCase()} requests`}
            </div>
            {!search && tab === "pending" && (
              <div style={{ fontSize: "0.85rem", marginTop: 4 }}>
                Share a form link from{" "}
                <Link href="/admin/product-forms" style={{ color: "#4884FF" }}>Product forms</Link> to start collecting requests.
              </div>
            )}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
              <thead>
                <tr style={{ background: "var(--surface-2, rgba(255,255,255,0.03))" }}>
                  <Th>Request</Th>
                  <Th>Customer</Th>
                  <Th>Product</Th>
                  <Th>Price</Th>
                  <Th>Date</Th>
                  <Th style={{ textAlign: "right" }}>Actions</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} style={{ borderTop: "1px solid var(--border)" }}>
                    <Td style={{ whiteSpace: "nowrap" }}>
                      <div style={{ fontWeight: 600 }}>{row.request_no ?? "—"}</div>
                      <div style={{ marginTop: 4 }}>
                        <Pill tone={row.status === "accepted" ? "ok" : row.status === "declined" ? "neutral" : "brand"}>
                          {REQUEST_STATUS_LABELS[row.status].toUpperCase()}
                        </Pill>
                      </div>
                    </Td>
                    <Td>
                      <div style={{ fontWeight: 500 }}>{row.customer_name}</div>
                      <div style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>{row.customer_phone}</div>
                      {row.customer_email && (
                        <div style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>{row.customer_email}</div>
                      )}
                    </Td>
                    <Td>
                      <div>{row.product_name}</div>
                      <div style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>
                        {row.plan_label || durationLabel(row.plan_duration)}
                      </div>
                    </Td>
                    <Td style={{ whiteSpace: "nowrap" }}>{fmtMoney(row.price, row.currency)}</Td>
                    <Td style={{ whiteSpace: "nowrap" }}>
                      {fmtDate(row.created_at)}
                      {row.status === "declined" && row.decline_reason && (
                        <div style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginTop: 3, maxWidth: 200 }}>
                          {row.decline_reason}
                        </div>
                      )}
                    </Td>
                    <Td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <div style={{ display: "inline-flex", gap: 6 }}>
                        {canReview && row.status === "pending" && (
                          <>
                            <button
                              type="button"
                              className="admin-btn admin-btn-primary"
                              style={{ padding: "6px 12px", background: "#22c55e", borderColor: "#22c55e" }}
                              onClick={() => setConfirmAccept(row)}
                              disabled={busyId === row.id}
                            >
                              {busyId === row.id ? "Working…" : "Accept"}
                            </button>
                            <button
                              type="button"
                              className="admin-btn admin-btn-ghost"
                              style={{ padding: "6px 12px" }}
                              onClick={() => setDeclining(row)}
                              disabled={busyId === row.id}
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {row.status === "accepted" && (
                          <Link href="/admin/sales" className="admin-btn admin-btn-ghost" style={{ padding: "6px 12px" }}>
                            View in sales
                          </Link>
                        )}
                        {canReview && row.status === "declined" && (
                          <IconBtn icon="fa-rotate-left" title="Move back to pending" onClick={() => reopen(row)} />
                        )}
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {confirmAccept && (
        <ConfirmModal
          title={`Accept ${confirmAccept.request_no ?? "this request"}?`}
          danger={false}
          confirmLabel="Accept and record sale"
          message={
            <>
              This records a sale of <strong>{confirmAccept.product_name}</strong> for{" "}
              <strong>{confirmAccept.customer_name}</strong> at{" "}
              <strong>{fmtMoney(confirmAccept.price, confirmAccept.currency)}</strong> in Daily Sales, dated today.
              {confirmAccept.plan_duration === "one_time"
                ? " It's a one-time purchase, so no renewal is scheduled."
                : ` Renewal is set one ${durationLabel(confirmAccept.plan_duration).toLowerCase()} cycle from today.`}
            </>
          }
          onCancel={() => setConfirmAccept(null)}
          onConfirm={async () => {
            const row = confirmAccept;
            setConfirmAccept(null);
            await accept(row);
          }}
        />
      )}

      {declining && (
        <DeclineModal
          row={declining}
          onClose={() => setDeclining(null)}
          onConfirm={async (reason) => {
            const row = declining;
            setDeclining(null);
            await decline(row, reason);
          }}
        />
      )}
    </div>
  );
}

function DeclineModal({
  row, onClose, onConfirm,
}: {
  row: SaleRequestRow;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <ModalShell
      title={`Reject ${row.request_no ?? "request"}`}
      size="sm"
      onClose={busy ? () => {} : onClose}
      footer={
        <>
          <button type="button" style={footerCancelStyle} onClick={onClose} disabled={busy}>CANCEL</button>
          <button
            type="button"
            style={{ ...footerPrimaryStyle(true), background: "#F54848" }}
            disabled={busy}
            onClick={async () => { setBusy(true); try { await onConfirm(reason); } finally { setBusy(false); } }}
          >
            {busy ? "WORKING…" : "REJECT REQUEST"}
          </button>
        </>
      }
    >
      <p style={{ marginTop: 0, fontSize: "0.9rem", lineHeight: 1.5 }}>
        Rejecting keeps the record — {row.customer_name}&apos;s request for {row.product_name} moves to Declined and no
        sale is created. The customer isn&apos;t notified automatically.
      </p>
      <Field label="Reason (optional)" hint="Internal only. Helps when reviewing declined requests later.">
        <textarea
          className="admin-input admin-textarea"
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. duplicate request, customer cancelled, payment not received"
        />
      </Field>
    </ModalShell>
  );
}
