"use client";

/**
 * Account Book — what the business owes vendors, and what customers owe it.
 *
 * Both ledgers share this screen because they're the same shape: a total, an
 * amount settled so far, and what's left. Status comes from the database
 * trigger, so it's displayed here and never edited.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ACCOUNT_STATUS_LABELS,
  accountSummary,
  fmtAmount,
  isOverdue,
  outstanding,
  type AccountStatus,
  type CustomerReceivableRow,
  type VendorPayableRow,
} from "@/lib/account-book";
import {
  deletePayable,
  deleteReceivable,
  recordCustomerPayment,
  recordVendorPayment,
  savePayable,
  saveReceivable,
  type PayableInput,
  type ReceivableInput,
} from "./actions";
import {
  ConfirmModal,
  Field,
  FieldRow,
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

export type Ledger = "payables" | "receivables";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

function StatusPill({ status, overdue }: { status: AccountStatus; overdue: boolean }) {
  if (overdue) return <Pill tone="neutral"><span style={{ color: "#F54848" }}>OVERDUE</span></Pill>;
  return (
    <Pill tone={status === "paid" ? "ok" : status === "partial" ? "brand" : "neutral"}>
      {ACCOUNT_STATUS_LABELS[status].toUpperCase()}
    </Pill>
  );
}

export default function AccountBookClient({
  payables,
  receivables,
  initialTab,
  canWrite,
}: {
  payables: VendorPayableRow[];
  receivables: CustomerReceivableRow[];
  initialTab: Ledger;
  canWrite: boolean;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Ledger>(initialTab);
  const [pay, setPay] = useState(payables);
  const [rec, setRec] = useState(receivables);
  const [flash, setFlash] = useState<{ kind: "ok" | "err" | "warn"; msg: string } | null>(null);
  const [editingPayable, setEditingPayable] = useState<VendorPayableRow | null>(null);
  const [editingReceivable, setEditingReceivable] = useState<CustomerReceivableRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [paying, setPaying] = useState<{ id: string; label: string; remaining: number; currency: string; ledger: Ledger } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; label: string; ledger: Ledger } | null>(null);

  function notify(kind: "ok" | "err" | "warn", msg: string) {
    setFlash({ kind, msg });
    setTimeout(() => setFlash(null), 5000);
  }

  const summary = useMemo(() => accountSummary(pay, rec), [pay, rec]);
  const currency = pay[0]?.currency || rec[0]?.currency || "PKR";

  async function submitPayable(input: PayableInput, id?: string) {
    const res = await savePayable(input, id);
    if (!res.ok) { notify("err", res.error); return false; }
    const row = res.data as VendorPayableRow;
    setPay((prev) => (id ? prev.map((p) => (p.id === id ? row : p)) : [row, ...prev]));
    notify("ok", id ? "Payable updated." : "Payable added.");
    router.refresh();
    return true;
  }

  async function submitReceivable(input: ReceivableInput, id?: string) {
    const res = await saveReceivable(input, id);
    if (!res.ok) { notify("err", res.error); return false; }
    const row = res.data as CustomerReceivableRow;
    setRec((prev) => (id ? prev.map((r) => (r.id === id ? row : r)) : [row, ...prev]));
    notify("ok", id ? "Receivable updated." : "Receivable added.");
    router.refresh();
    return true;
  }

  async function payAmount(amount: number) {
    if (!paying) return;
    const res = paying.ledger === "payables"
      ? await recordVendorPayment(paying.id, amount)
      : await recordCustomerPayment(paying.id, amount);
    if (!res.ok) { notify("err", res.error); return; }
    if (paying.ledger === "payables") {
      setPay((prev) => prev.map((p) => (p.id === paying.id ? (res.data as VendorPayableRow) : p)));
    } else {
      setRec((prev) => prev.map((r) => (r.id === paying.id ? (res.data as CustomerReceivableRow) : r)));
    }
    notify("ok", paying.ledger === "payables" ? "Payment recorded." : "Receipt recorded.");
    setPaying(null);
    router.refresh();
  }

  async function remove(target: { id: string; ledger: Ledger }) {
    const res = target.ledger === "payables" ? await deletePayable(target.id) : await deleteReceivable(target.id);
    if (!res.ok) { notify("err", res.error); return; }
    if (target.ledger === "payables") setPay((prev) => prev.filter((p) => p.id !== target.id));
    else setRec((prev) => prev.filter((r) => r.id !== target.id));
    notify("ok", "Entry deleted.");
    router.refresh();
  }

  return (
    <div>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18, gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "1.65rem", margin: "0 0 4px" }}>Account book</h1>
          <p style={{ color: "var(--text-muted)", margin: 0, fontSize: "0.92rem" }}>
            Money you owe vendors and money customers owe you, with what&apos;s still outstanding on each.
          </p>
        </div>
        {canWrite && (
          <button className="admin-btn admin-btn-primary" onClick={() => setCreating(true)}>
            <i className="fa-solid fa-plus" /> {tab === "payables" ? "New payable" : "New receivable"}
          </button>
        )}
      </header>

      {flash && <div style={{ ...flashStyle(flash.kind), marginBottom: 14 }}>{flash.msg}</div>}

      {/* Summary — outstanding only, so a settled invoice stops counting. */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 18 }}>
        <StatCard icon="fa-arrow-up-from-bracket" tone="danger" label={`Total payable (${currency})`} value={summary.totalPayable.toLocaleString("en-PK")} />
        <StatCard icon="fa-arrow-down-to-bracket" tone="ok" label={`Total receivable (${currency})`} value={summary.totalReceivable.toLocaleString("en-PK")} />
        <StatCard
          icon="fa-scale-balanced"
          tone={summary.netBalance >= 0 ? "brand" : "warn"}
          label={`Net balance (${currency})`}
          value={summary.netBalance.toLocaleString("en-PK")}
        />
      </div>

      <div role="tablist" aria-label="Ledger" style={{ display: "inline-flex", gap: 6, marginBottom: 14 }}>
        {([["payables", "Vendor payable"], ["receivables", "Customer receivable"]] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={`admin-btn ${tab === value ? "admin-btn-primary" : "admin-btn-ghost"}`}
            style={{ padding: "8px 14px" }}
          >
            {label} <span style={{ opacity: 0.7 }}>({value === "payables" ? pay.length : rec.length})</span>
          </button>
        ))}
      </div>

      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        {(tab === "payables" ? pay : rec).length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-muted)" }}>
            <i className="fa-solid fa-book" style={{ fontSize: 28, marginBottom: 10, display: "block" }} />
            <div style={{ fontWeight: 600, color: "var(--text)" }}>
              {tab === "payables" ? "No vendor payables" : "No customer receivables"}
            </div>
            <div style={{ fontSize: "0.85rem", marginTop: 4 }}>
              {canWrite
                ? tab === "payables"
                  ? "Add a bill you owe a supplier to start tracking it."
                  : "Add an invoice a customer still owes on."
                : "Ask an admin with account book access to add entries."}
            </div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
              <thead>
                <tr style={{ background: "var(--surface-2, rgba(255,255,255,0.03))" }}>
                  <Th>{tab === "payables" ? "Vendor" : "Customer"}</Th>
                  <Th>{tab === "payables" ? "For" : "Product / invoice"}</Th>
                  <Th>Total</Th>
                  <Th>{tab === "payables" ? "Paid" : "Received"}</Th>
                  <Th>Remaining</Th>
                  <Th>Due</Th>
                  <Th>Status</Th>
                  <Th style={{ textAlign: "right" }}>Actions</Th>
                </tr>
              </thead>
              <tbody>
                {tab === "payables"
                  ? pay.map((row) => {
                      const left = outstanding(row.amount, row.paid_amount);
                      return (
                        <tr key={row.id} style={{ borderTop: "1px solid var(--border)" }}>
                          <Td>
                            <div style={{ fontWeight: 500 }}>{row.vendor_name}</div>
                            {row.vendor_contact && (
                              <div style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>{row.vendor_contact}</div>
                            )}
                          </Td>
                          <Td>{row.description || "—"}</Td>
                          <Td style={{ whiteSpace: "nowrap" }}>{fmtAmount(row.amount, row.currency)}</Td>
                          <Td style={{ whiteSpace: "nowrap" }}>{fmtAmount(row.paid_amount, row.currency)}</Td>
                          <Td style={{ whiteSpace: "nowrap", fontWeight: 600 }}>{fmtAmount(left, row.currency)}</Td>
                          <Td style={{ whiteSpace: "nowrap" }}>{fmtDate(row.due_date)}</Td>
                          <Td><StatusPill status={row.status} overdue={isOverdue(row.due_date, row.status)} /></Td>
                          <Td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                            {canWrite && (
                              <div style={{ display: "inline-flex", gap: 6 }}>
                                {left > 0 && (
                                  <IconBtn
                                    icon="fa-money-bill-transfer"
                                    title="Record a payment"
                                    color="#22c55e"
                                    onClick={() => setPaying({ id: row.id, label: row.vendor_name, remaining: left, currency: row.currency, ledger: "payables" })}
                                  />
                                )}
                                <IconBtn icon="fa-pen" title="Edit" onClick={() => setEditingPayable(row)} />
                                <IconBtn icon="fa-trash" title="Delete" color="#F54848" onClick={() => setConfirmDelete({ id: row.id, label: row.vendor_name, ledger: "payables" })} />
                              </div>
                            )}
                          </Td>
                        </tr>
                      );
                    })
                  : rec.map((row) => {
                      const left = outstanding(row.amount, row.received_amount);
                      return (
                        <tr key={row.id} style={{ borderTop: "1px solid var(--border)" }}>
                          <Td>
                            <div style={{ fontWeight: 500 }}>{row.customer_name}</div>
                            {row.customer_phone && (
                              <div style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>{row.customer_phone}</div>
                            )}
                          </Td>
                          <Td>
                            <div>{row.product_name || "—"}</div>
                            {row.invoice_no && (
                              <div style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>#{row.invoice_no}</div>
                            )}
                          </Td>
                          <Td style={{ whiteSpace: "nowrap" }}>{fmtAmount(row.amount, row.currency)}</Td>
                          <Td style={{ whiteSpace: "nowrap" }}>{fmtAmount(row.received_amount, row.currency)}</Td>
                          <Td style={{ whiteSpace: "nowrap", fontWeight: 600 }}>{fmtAmount(left, row.currency)}</Td>
                          <Td style={{ whiteSpace: "nowrap" }}>{fmtDate(row.due_date)}</Td>
                          <Td><StatusPill status={row.status} overdue={isOverdue(row.due_date, row.status)} /></Td>
                          <Td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                            {canWrite && (
                              <div style={{ display: "inline-flex", gap: 6 }}>
                                {left > 0 && (
                                  <IconBtn
                                    icon="fa-money-bill-transfer"
                                    title="Record money received"
                                    color="#22c55e"
                                    onClick={() => setPaying({ id: row.id, label: row.customer_name, remaining: left, currency: row.currency, ledger: "receivables" })}
                                  />
                                )}
                                <IconBtn icon="fa-pen" title="Edit" onClick={() => setEditingReceivable(row)} />
                                <IconBtn icon="fa-trash" title="Delete" color="#F54848" onClick={() => setConfirmDelete({ id: row.id, label: row.customer_name, ledger: "receivables" })} />
                              </div>
                            )}
                          </Td>
                        </tr>
                      );
                    })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="admin-help" style={{ marginTop: 12 }}>
        Sales recorded in{" "}
        <Link href="/admin/sales" style={{ color: "#4884FF" }}>Daily sales</Link> are money already taken. Use
        receivables only for what a customer still owes.
      </p>

      {(creating || editingPayable) && tab === "payables" && (
        <PayableEditor
          key={editingPayable?.id ?? "new-payable"}
          initial={editingPayable}
          onClose={() => { setCreating(false); setEditingPayable(null); }}
          onSubmit={async (input) => {
            const ok = await submitPayable(input, editingPayable?.id);
            if (ok) { setCreating(false); setEditingPayable(null); }
          }}
        />
      )}

      {(creating || editingReceivable) && tab === "receivables" && (
        <ReceivableEditor
          key={editingReceivable?.id ?? "new-receivable"}
          initial={editingReceivable}
          onClose={() => { setCreating(false); setEditingReceivable(null); }}
          onSubmit={async (input) => {
            const ok = await submitReceivable(input, editingReceivable?.id);
            if (ok) { setCreating(false); setEditingReceivable(null); }
          }}
        />
      )}

      {paying && (
        <PaymentModal
          target={paying}
          onClose={() => setPaying(null)}
          onConfirm={payAmount}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          title={`Delete this entry for ${confirmDelete.label}?`}
          confirmLabel="Delete"
          message={<>The entry and its payment history are removed from the account book. This can&apos;t be undone.</>}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={async () => {
            const target = confirmDelete;
            setConfirmDelete(null);
            await remove(target);
          }}
        />
      )}
    </div>
  );
}

function PaymentModal({
  target, onClose, onConfirm,
}: {
  target: { label: string; remaining: number; currency: string; ledger: Ledger };
  onClose: () => void;
  onConfirm: (amount: number) => Promise<void>;
}) {
  const [amount, setAmount] = useState(String(target.remaining));
  const [busy, setBusy] = useState(false);
  const value = Number(amount);
  const valid = Number.isFinite(value) && value > 0;

  return (
    <ModalShell
      title={target.ledger === "payables" ? `Record a payment to ${target.label}` : `Record money from ${target.label}`}
      size="sm"
      onClose={busy ? () => {} : onClose}
      footer={
        <>
          <button type="button" style={footerCancelStyle} onClick={onClose} disabled={busy}>CANCEL</button>
          <button
            type="button"
            style={footerPrimaryStyle(valid && !busy)}
            disabled={!valid || busy}
            onClick={async () => { setBusy(true); try { await onConfirm(value); } finally { setBusy(false); } }}
          >
            {busy ? "SAVING…" : "RECORD"}
          </button>
        </>
      }
    >
      <p style={{ marginTop: 0, fontSize: "0.9rem" }}>
        Outstanding: <strong>{fmtAmount(target.remaining, target.currency)}</strong>. Anything above that is capped at
        the remaining balance.
      </p>
      <Field label={`Amount (${target.currency})`}>
        <input className="admin-input" value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" autoFocus />
      </Field>
    </ModalShell>
  );
}

function PayableEditor({
  initial, onClose, onSubmit,
}: {
  initial: VendorPayableRow | null;
  onClose: () => void;
  onSubmit: (input: PayableInput) => Promise<void>;
}) {
  const [vendorName, setVendorName] = useState(initial?.vendor_name ?? "");
  const [contact, setContact] = useState(initial?.vendor_contact ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [paid, setPaid] = useState(initial ? String(initial.paid_amount) : "0");
  const [currency, setCurrency] = useState(initial?.currency ?? "PKR");
  const [dueDate, setDueDate] = useState(initial?.due_date ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [busy, setBusy] = useState(false);

  const valid = vendorName.trim().length > 0 && Number(amount) > 0;

  return (
    <ModalShell
      title={initial ? `Edit payable — ${initial.vendor_name}` : "New vendor payable"}
      size="md"
      onClose={busy ? () => {} : onClose}
      footer={
        <>
          <button type="button" style={footerCancelStyle} onClick={onClose} disabled={busy}>CANCEL</button>
          <button
            type="button"
            style={footerPrimaryStyle(valid && !busy)}
            disabled={!valid || busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onSubmit({
                  vendor_name: vendorName,
                  vendor_contact: contact || null,
                  description: description || null,
                  amount: Number(amount),
                  paid_amount: Number(paid) || 0,
                  currency,
                  due_date: dueDate || null,
                  notes: notes || null,
                });
              } finally { setBusy(false); }
            }}
          >
            {busy ? "SAVING…" : initial ? "SAVE CHANGES" : "ADD PAYABLE"}
          </button>
        </>
      }
    >
      <div style={{ display: "grid", gap: 14 }}>
        <FieldRow>
          <Field label="Vendor name">
            <input className="admin-input" value={vendorName} onChange={(e) => setVendorName(e.target.value)} placeholder="OpenAI Supplier" />
          </Field>
          <Field label="Vendor contact (optional)">
            <input className="admin-input" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="03001234567" />
          </Field>
        </FieldRow>
        <Field label="Product / service (optional)">
          <input className="admin-input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="ChatGPT Plus accounts — October" />
        </Field>
        <FieldRow min={150}>
          <Field label="Total amount">
            <input className="admin-input" value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="50000" />
          </Field>
          <Field label="Already paid" hint="Status is worked out from these two.">
            <input className="admin-input" value={paid} onChange={(e) => setPaid(e.target.value)} inputMode="decimal" />
          </Field>
          <Field label="Currency">
            <input className="admin-input" value={currency} onChange={(e) => setCurrency(e.target.value)} />
          </Field>
        </FieldRow>
        <FieldRow>
          <Field label="Due date (optional)">
            <input className="admin-input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </Field>
        </FieldRow>
        <Field label="Notes (optional)">
          <textarea className="admin-input admin-textarea" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </div>
    </ModalShell>
  );
}

function ReceivableEditor({
  initial, onClose, onSubmit,
}: {
  initial: CustomerReceivableRow | null;
  onClose: () => void;
  onSubmit: (input: ReceivableInput) => Promise<void>;
}) {
  const [customerName, setCustomerName] = useState(initial?.customer_name ?? "");
  const [phone, setPhone] = useState(initial?.customer_phone ?? "");
  const [productName, setProductName] = useState(initial?.product_name ?? "");
  const [invoiceNo, setInvoiceNo] = useState(initial?.invoice_no ?? "");
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [received, setReceived] = useState(initial ? String(initial.received_amount) : "0");
  const [currency, setCurrency] = useState(initial?.currency ?? "PKR");
  const [dueDate, setDueDate] = useState(initial?.due_date ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [busy, setBusy] = useState(false);

  const remaining = Math.max(0, (Number(amount) || 0) - (Number(received) || 0));
  const valid = customerName.trim().length > 0 && Number(amount) > 0;

  return (
    <ModalShell
      title={initial ? `Edit receivable — ${initial.customer_name}` : "New customer receivable"}
      size="md"
      onClose={busy ? () => {} : onClose}
      footer={
        <>
          <button type="button" style={footerCancelStyle} onClick={onClose} disabled={busy}>CANCEL</button>
          <button
            type="button"
            style={footerPrimaryStyle(valid && !busy)}
            disabled={!valid || busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onSubmit({
                  customer_name: customerName,
                  customer_phone: phone || null,
                  product_name: productName || null,
                  invoice_no: invoiceNo || null,
                  amount: Number(amount),
                  received_amount: Number(received) || 0,
                  currency,
                  due_date: dueDate || null,
                  notes: notes || null,
                });
              } finally { setBusy(false); }
            }}
          >
            {busy ? "SAVING…" : initial ? "SAVE CHANGES" : "ADD RECEIVABLE"}
          </button>
        </>
      }
    >
      <div style={{ display: "grid", gap: 14 }}>
        <FieldRow>
          <Field label="Customer name">
            <input className="admin-input" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Ahmed" />
          </Field>
          <Field label="Phone (optional)">
            <input className="admin-input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="03001234567" />
          </Field>
        </FieldRow>
        <FieldRow>
          <Field label="Product (optional)">
            <input className="admin-input" value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="ChatGPT Plus" />
          </Field>
          <Field label="Invoice ID (optional)">
            <input className="admin-input" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} placeholder="INV-001" />
          </Field>
        </FieldRow>
        <FieldRow min={150}>
          <Field label="Total amount">
            <input className="admin-input" value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="5000" />
          </Field>
          <Field label="Received" hint={`Remaining: ${remaining.toLocaleString("en-PK")}`}>
            <input className="admin-input" value={received} onChange={(e) => setReceived(e.target.value)} inputMode="decimal" />
          </Field>
          <Field label="Currency">
            <input className="admin-input" value={currency} onChange={(e) => setCurrency(e.target.value)} />
          </Field>
        </FieldRow>
        <FieldRow>
          <Field label="Due date (optional)">
            <input className="admin-input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </Field>
        </FieldRow>
        <Field label="Notes (optional)">
          <textarea className="admin-input admin-textarea" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </div>
    </ModalShell>
  );
}
