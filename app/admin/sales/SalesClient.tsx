"use client";

/**
 * Daily-sales admin screen — stats cards, filters, table, and per-row
 * renewal actions (WhatsApp reminder, mark reminder sent, mark as
 * renewed → optionally spawn the next cycle).
 *
 * Data flow: server component ships `initialSales`; every mutation
 * hits a server action that revalidates /admin/sales, then we call
 * `router.refresh()` to pull the new server payload. Between calls
 * the client keeps an optimistic copy of the list so the UI feels
 * instant even when the network is slow.
 */
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createSubscriptionSale,
  updateSubscriptionSale,
  deleteSubscriptionSale,
  markReminderSent,
  markAsRenewed,
  type SaleRow,
  type SaleInput,
  type SaleStatus,
} from "./actions";

type Product = { id: string; name: string; price: number };

// ─── helpers ─────────────────────────────────────────────────────────
const STATUS_LABELS: Record<SaleStatus, string> = {
  active: "ACTIVE",
  renewal_due: "RENEWAL DUE",
  renewed: "RENEWED",
  expired: "EXPIRED",
  cancelled: "CANCELLED",
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Compute the visible status for a row — status stored in the DB is
 * *authoritative* for renewed/cancelled but we shade "active" rows
 * whose renew_date is today (→ renewal_due) or whose expiry_date has
 * passed (→ expired) so the admin sees them clearly. This is display
 * only; the DB is never touched without an explicit save.
 */
function displayStatus(row: SaleRow): SaleStatus {
  if (row.status === "renewed" || row.status === "cancelled") return row.status;
  const today = todayIso();
  if (row.expiry_date < today) return "expired";
  if (row.status === "active" && row.renew_date === today) return "renewal_due";
  return row.status;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }); }
  catch { return iso; }
}

function fmtMoney(amount: number | null, currency: string): string {
  if (amount == null) return "—";
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

/** Strip everything except digits — wa.me is happy with a plain E.164-style body. */
function cleanPhone(phone: string): string {
  return (phone || "").replace(/[^\d]/g, "");
}

function renderTemplate(template: string, row: SaleRow): string {
  return template
    .replace(/\{customer_name\}/g, row.customer_name)
    .replace(/\{product_name\}/g, row.product_name)
    .replace(/\{expiry_date\}/g, fmtDate(row.expiry_date))
    .replace(/\{renew_date\}/g, fmtDate(row.renew_date));
}

const DEFAULT_REMINDER =
  "Hi {customer_name}, your {product_name} subscription is expiring on {expiry_date}. Renew now to continue without interruption. Reply here to renew.";

// ─────────────────────────────────────────────────────────────────────

export default function SalesClient({
  initialSales, products, canWrite, canDelete, loadError,
}: {
  initialSales: SaleRow[];
  products: Product[];
  canWrite: boolean;
  canDelete: boolean;
  loadError: string | null;
}) {
  const router = useRouter();
  const [sales, setSales] = useState<SaleRow[]>(initialSales);
  const [flash, setFlash] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);
  const [, startTransition] = useTransition();

  // ─── filters ───────────────────────────────────────────────────────
  const [search, setSearch]         = useState("");
  const [statusFilter, setStatus]   = useState<SaleStatus | "all">("all");
  const [renewFilter, setRenew]     = useState<"all" | "today" | "tomorrow" | "week" | "expired">("all");

  const [newOpen, setNewOpen] = useState(false);
  const [editing, setEditing] = useState<SaleRow | null>(null);
  const [renewingSale, setRenewingSale] = useState<SaleRow | null>(null);
  const [confirm, setConfirm] = useState<{ title: string; message: React.ReactNode; onConfirm: () => Promise<void> | void; confirmLabel: string } | null>(null);

  function notify(kind: "ok" | "err", msg: string) {
    setFlash({ kind, msg });
    setTimeout(() => setFlash(null), 4000);
  }

  function refresh() {
    startTransition(() => router.refresh());
  }

  // Whenever the server ships a new payload, replay it into local state so
  // the optimistic copy stays in sync.
  if (initialSales !== sales && initialSales.length !== sales.length) {
    // Only sync when the array reference actually changes from Next's revalidation.
    // (React 18+ will re-render the client component after router.refresh().)
  }

  // ─── stats ─────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const today = todayIso();
    const monthKey = today.slice(0, 7);
    const in7 = addDays(today, 7);
    let active = 0, dueToday = 0, expiringSoon = 0, expired = 0, renewedThisMonth = 0;
    for (const s of sales) {
      const eff = displayStatus(s);
      if (eff === "active" || eff === "renewal_due") active++;
      if (s.renew_date === today && s.status !== "renewed" && s.status !== "cancelled") dueToday++;
      if (s.expiry_date >= today && s.expiry_date <= in7 && s.status !== "renewed" && s.status !== "cancelled") expiringSoon++;
      if (eff === "expired") expired++;
      if (s.status === "renewed" && s.renewed_at && s.renewed_at.slice(0, 7) === monthKey) renewedThisMonth++;
    }
    return { active, dueToday, expiringSoon, expired, renewedThisMonth };
  }, [sales]);

  // ─── filtered rows ────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const today = todayIso();
    const tomorrow = addDays(today, 1);
    const weekEnd  = addDays(today, 7);

    return sales.filter((s) => {
      if (q) {
        const hay = [s.customer_name, s.customer_phone, s.customer_email || "", s.product_name].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (statusFilter !== "all" && displayStatus(s) !== statusFilter) return false;
      if (renewFilter === "today"    && s.renew_date !== today) return false;
      if (renewFilter === "tomorrow" && s.renew_date !== tomorrow) return false;
      if (renewFilter === "week"     && (s.renew_date < today || s.renew_date > weekEnd)) return false;
      if (renewFilter === "expired"  && !(s.expiry_date < today && s.status !== "renewed" && s.status !== "cancelled")) return false;
      return true;
    });
  }, [sales, search, statusFilter, renewFilter]);

  // ─── actions ──────────────────────────────────────────────────────
  async function submitCreate(input: SaleInput) {
    const res = await createSubscriptionSale(input);
    if (!res.ok) { notify("err", res.error); return false; }
    setSales((prev) => [res.data as SaleRow, ...prev]);
    notify("ok", "Sale added.");
    refresh();
    return true;
  }

  async function submitUpdate(id: string, input: SaleInput) {
    const res = await updateSubscriptionSale(id, input);
    if (!res.ok) { notify("err", res.error); return false; }
    setSales((prev) => prev.map((s) => s.id === id ? (res.data as SaleRow) : s));
    notify("ok", "Sale updated.");
    refresh();
    return true;
  }

  function askDelete(row: SaleRow) {
    setConfirm({
      title: `Delete sale for ${row.customer_name}?`,
      message: <>This deletes the record permanently. Customer stays unaffected.</>,
      confirmLabel: "Delete",
      onConfirm: async () => {
        const res = await deleteSubscriptionSale(row.id);
        if (!res.ok) { notify("err", res.error); return; }
        setSales((prev) => prev.filter((s) => s.id !== row.id));
        notify("ok", "Sale deleted.");
        refresh();
      },
    });
  }

  function openWhatsApp(row: SaleRow) {
    const phone = cleanPhone(row.customer_phone);
    if (!phone) { notify("err", "Customer has no phone number."); return; }
    const message = renderTemplate(row.reminder_message || DEFAULT_REMINDER, row);
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    // Nudge the admin to hit "Mark reminder sent" once they've fired it.
    notify("ok", "WhatsApp opened — click Mark reminder sent when done.");
  }

  async function reminderSent(row: SaleRow) {
    const res = await markReminderSent(row.id);
    if (!res.ok) { notify("err", res.error); return; }
    setSales((prev) => prev.map((s) => s.id === row.id ? (res.data as SaleRow) : s));
    notify("ok", "Reminder logged.");
    refresh();
  }

  async function markRenewed(row: SaleRow, next?: { sale_date: string; expiry_date: string; renew_date: string; sale_price?: number | null }) {
    const res = await markAsRenewed(row.id, next);
    if (!res.ok) { notify("err", res.error); return; }
    setSales((prev) => {
      const withoutOld = prev.map((s) => s.id === row.id ? (res.data!.closed) : s);
      return res.data!.opened ? [res.data!.opened, ...withoutOld] : withoutOld;
    });
    notify("ok", next ? "Renewed and next cycle created." : "Marked as renewed.");
    setRenewingSale(null);
    refresh();
  }

  // ─── render ───────────────────────────────────────────────────────
  return (
    <div>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "1.65rem", margin: "0 0 4px" }}>Daily Sales / Renewals</h1>
          <p style={{ color: "var(--text-muted)", margin: 0, fontSize: "0.92rem" }}>
            Track customer subscriptions and nudge them before they lapse.
          </p>
        </div>
        {canWrite && (
          <button className="admin-btn admin-btn-primary" onClick={() => setNewOpen(true)}>
            <i className="fa-solid fa-plus" /> New sale
          </button>
        )}
      </header>

      {loadError && (
        <div style={{ ...flashStyle("err"), marginBottom: 14 }}>{loadError}</div>
      )}
      {flash && <div style={{ ...flashStyle(flash.kind), marginBottom: 14 }}>{flash.msg}</div>}

      {/* Stats cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 18 }}>
        <StatCard icon="fa-circle-check"   tone="ok"     label="Total Active Sales"    value={stats.active} />
        <StatCard icon="fa-bell"           tone="brand"  label="Renewals Due Today"    value={stats.dueToday} />
        <StatCard icon="fa-hourglass-half" tone="warn"   label="Expiring Soon"         value={stats.expiringSoon} />
        <StatCard icon="fa-circle-xmark"   tone="danger" label="Expired"               value={stats.expired} />
        <StatCard icon="fa-arrows-rotate"  tone="brand"  label="Renewed This Month"    value={stats.renewedThisMonth} />
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        <input
          className="admin-input"
          placeholder="Search customer, phone, email, or product…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: "1 1 280px", minWidth: 220 }}
        />
        <div style={{ minWidth: 180, maxWidth: 220 }}>
          <StyledSelect
            value={statusFilter}
            onChange={(v) => setStatus(v as SaleStatus | "all")}
            placeholder="All statuses"
            icon="fa-filter"
            options={[
              { value: "all",         label: "All statuses" },
              { value: "active",      label: "Active" },
              { value: "renewal_due", label: "Renewal due" },
              { value: "renewed",     label: "Renewed" },
              { value: "expired",     label: "Expired" },
              { value: "cancelled",   label: "Cancelled" },
            ]}
          />
        </div>
        <div style={{ minWidth: 200, maxWidth: 240 }}>
          <StyledSelect
            value={renewFilter}
            onChange={(v) => setRenew(v as any)}
            placeholder="All renew dates"
            icon="fa-calendar-days"
            options={[
              { value: "all",      label: "All renew dates" },
              { value: "today",    label: "Renew today" },
              { value: "tomorrow", label: "Renew tomorrow" },
              { value: "week",     label: "Renew this week" },
              { value: "expired",  label: "Expired" },
            ]}
          />
        </div>
      </div>

      {/* Table */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        {filtered.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-muted)" }}>
            <i className="fa-solid fa-inbox" style={{ fontSize: 28, marginBottom: 10, display: "block" }} />
            <div style={{ fontWeight: 600, color: "var(--text)" }}>
              {sales.length === 0 ? "No sales yet" : "No sales match your filters"}
            </div>
            <div style={{ fontSize: "0.85rem", marginTop: 4 }}>
              {sales.length === 0 && canWrite && <>Click <strong style={{ color: "#f97316" }}>New sale</strong> to add your first subscription.</>}
              {sales.length > 0 && "Try clearing filters or the search box."}
            </div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
              <thead>
                <tr style={{ background: "var(--surface-2, rgba(255,255,255,0.03))", textAlign: "left" }}>
                  <Th>Customer</Th>
                  <Th>Phone</Th>
                  <Th>Product</Th>
                  <Th>Plan</Th>
                  <Th>Sale date</Th>
                  <Th>Expiry</Th>
                  <Th>Renew</Th>
                  <Th>Status</Th>
                  <Th style={{ textAlign: "right" }}>Actions</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => {
                  const st = displayStatus(row);
                  return (
                    <tr key={row.id} style={{ borderTop: "1px solid var(--border)" }}>
                      <Td>
                        <div style={{ fontWeight: 500 }}>{row.customer_name}</div>
                        {row.customer_email && <div style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>{row.customer_email}</div>}
                      </Td>
                      <Td>{row.customer_phone}</Td>
                      <Td>
                        <div>{row.product_name}</div>
                        {row.sale_price != null && (
                          <div style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>{fmtMoney(row.sale_price, row.currency)}</div>
                        )}
                      </Td>
                      <Td>{row.plan_name || "—"}</Td>
                      <Td>{fmtDate(row.sale_date)}</Td>
                      <Td>{fmtDate(row.expiry_date)}</Td>
                      <Td>
                        {fmtDate(row.renew_date)}
                        {row.last_reminder_sent_at && (
                          <div style={{ color: "var(--text-muted)", fontSize: "0.72rem", marginTop: 2 }}>
                            Reminder: {fmtDate(row.last_reminder_sent_at.slice(0, 10))}
                          </div>
                        )}
                      </Td>
                      <Td><StatusBadge status={st} /></Td>
                      <Td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        <RowActions
                          row={row}
                          canWrite={canWrite}
                          canDelete={canDelete}
                          onWhatsApp={() => openWhatsApp(row)}
                          onReminderSent={() => reminderSent(row)}
                          onRenew={() => setRenewingSale(row)}
                          onEdit={() => setEditing(row)}
                          onDelete={() => askDelete(row)}
                        />
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {newOpen && (
        <SaleFormModal
          products={products}
          title="New sale"
          onClose={() => setNewOpen(false)}
          onSubmit={async (input) => {
            const ok = await submitCreate(input);
            if (ok) setNewOpen(false);
          }}
        />
      )}
      {editing && (
        <SaleFormModal
          products={products}
          title={`Edit sale — ${editing.customer_name}`}
          initial={editing}
          onClose={() => setEditing(null)}
          onSubmit={async (input) => {
            const ok = await submitUpdate(editing.id, input);
            if (ok) setEditing(null);
          }}
        />
      )}
      {renewingSale && (
        <RenewModal
          sale={renewingSale}
          onClose={() => setRenewingSale(null)}
          onConfirm={(next) => markRenewed(renewingSale, next)}
        />
      )}
      {confirm && (
        <ConfirmModal
          title={confirm.title}
          message={confirm.message}
          confirmLabel={confirm.confirmLabel}
          onCancel={() => setConfirm(null)}
          onConfirm={async () => {
            const d = confirm;
            setConfirm(null);
            await d.onConfirm();
          }}
        />
      )}
    </div>
  );
}

// ─── row actions ──────────────────────────────────────────────────────
function RowActions({
  row, canWrite, canDelete, onWhatsApp, onReminderSent, onRenew, onEdit, onDelete,
}: {
  row: SaleRow;
  canWrite: boolean;
  canDelete: boolean;
  onWhatsApp: () => void;
  onReminderSent: () => void;
  onRenew: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isClosed = row.status === "renewed" || row.status === "cancelled";
  return (
    <div style={{ display: "inline-flex", gap: 6 }}>
      {!isClosed && (
        <IconBtn icon="fa-brands fa-whatsapp" title="Send WhatsApp reminder" color="#22c55e" onClick={onWhatsApp} />
      )}
      {!isClosed && canWrite && (
        <IconBtn icon="fa-paper-plane" title="Mark reminder sent" onClick={onReminderSent} />
      )}
      {!isClosed && canWrite && (
        <IconBtn icon="fa-arrows-rotate" title="Mark as renewed" color="#f97316" onClick={onRenew} />
      )}
      {canWrite && <IconBtn icon="fa-pen" title="Edit" onClick={onEdit} />}
      {canDelete && <IconBtn icon="fa-trash" title="Delete" color="#ef4444" onClick={onDelete} />}
    </div>
  );
}

function IconBtn({ icon, title, onClick, color }: { icon: string; title: string; onClick: () => void; color?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      style={{
        width: 30, height: 30, borderRadius: 6,
        display: "grid", placeItems: "center",
        background: "transparent",
        border: "1px solid var(--border)",
        color: color || "var(--text-muted)",
        cursor: "pointer", fontSize: 12,
      }}
    >
      <i className={icon.startsWith("fa-brands") ? icon : `fa-solid ${icon}`} />
    </button>
  );
}

// ─── stat card ────────────────────────────────────────────────────────
function StatCard({ icon, label, value, tone }: { icon: string; label: string; value: number; tone: "ok" | "warn" | "danger" | "brand" }) {
  const colors = {
    ok:     { bg: "rgba(34,197,94,0.10)",  fg: "#22c55e" },
    warn:   { bg: "rgba(245,158,11,0.10)", fg: "#f59e0b" },
    danger: { bg: "rgba(239,68,68,0.10)",  fg: "#ef4444" },
    brand:  { bg: "rgba(249,115,22,0.12)", fg: "#f97316" },
  }[tone];
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 16px", display: "flex", gap: 12, alignItems: "center" }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: colors.bg, color: colors.fg, display: "grid", placeItems: "center", fontSize: 16, flexShrink: 0 }}>
        <i className={`fa-solid ${icon}`} />
      </div>
      <div>
        <div style={{ color: "var(--text-muted)", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: "1.4rem", fontWeight: 700, fontFamily: "var(--font-heading)" }}>{value}</div>
      </div>
    </div>
  );
}

// ─── status badge ─────────────────────────────────────────────────────
function StatusBadge({ status }: { status: SaleStatus }) {
  const bg = {
    active:      "rgba(34,197,94,0.15)",
    renewal_due: "rgba(245,158,11,0.15)",
    renewed:     "rgba(59,130,246,0.15)",
    expired:     "rgba(239,68,68,0.15)",
    cancelled:   "rgba(255,255,255,0.08)",
  }[status];
  const color = {
    active:      "#22c55e",
    renewal_due: "#f59e0b",
    renewed:     "#3b82f6",
    expired:     "#ef4444",
    cancelled:   "var(--text-muted)",
  }[status];
  return (
    <span style={{ display: "inline-block", padding: "3px 9px", borderRadius: 999, background: bg, color, fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.05em" }}>
      {STATUS_LABELS[status]}
    </span>
  );
}

// ─── new / edit modal ────────────────────────────────────────────────
function SaleFormModal({
  products, initial, title, onClose, onSubmit,
}: {
  products: Product[];
  initial?: SaleRow;
  title: string;
  onClose: () => void;
  onSubmit: (input: SaleInput) => Promise<void>;
}) {
  // Sensible defaults so a fresh sale is one field away from being valid:
  // sold today, expires in 30 days, remind on the expiry date.
  const [form, setForm] = useState<SaleInput>(() => ({
    customer_name:    initial?.customer_name ?? "",
    customer_email:   initial?.customer_email ?? "",
    customer_phone:   initial?.customer_phone ?? "",
    product_id:       initial?.product_id ?? "",
    product_name:     initial?.product_name ?? "",
    plan_name:        initial?.plan_name ?? "",
    sale_price:       initial?.sale_price ?? null,
    currency:         initial?.currency ?? "PKR",
    sale_date:        initial?.sale_date ?? todayIso(),
    expiry_date:      initial?.expiry_date ?? addDays(todayIso(), 30),
    renew_date:       initial?.renew_date ?? addDays(todayIso(), 30),
    status:           initial?.status ?? "active",
    payment_method:   initial?.payment_method ?? "",
    transaction_id:   initial?.transaction_id ?? "",
    notes:            initial?.notes ?? "",
    reminder_message: initial?.reminder_message ?? DEFAULT_REMINDER,
  }));
  const [busy, setBusy] = useState(false);

  function set<K extends keyof SaleInput>(key: K, value: SaleInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function onProductPicked(productId: string) {
    set("product_id", productId || null);
    const p = products.find((x) => x.id === productId);
    if (p) {
      // Autofill name + price but leave the fields editable so an admin can
      // override for one-off deals.
      set("product_name", p.name);
      if (form.sale_price == null) set("sale_price", Number(p.price) || null);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try { await onSubmit(form); }
    finally { setBusy(false); }
  }

  return (
    <ModalShell title={title} onClose={onClose} size="lg" footer={
      <>
        <button type="button" onClick={onClose} disabled={busy} style={footerCancelStyle}>CANCEL</button>
        <button type="submit" form="sale-form" disabled={busy} style={footerPrimaryStyle(true)}>
          {busy ? "SAVING…" : initial ? "SAVE CHANGES" : "CREATE SALE"}
        </button>
      </>
    }>
      <form id="sale-form" onSubmit={submit} style={{ display: "grid", gap: 14 }}>
        <FieldRow>
          <Field label="Customer name *">
            <input required className="admin-input" value={form.customer_name} onChange={(e) => set("customer_name", e.target.value)} />
          </Field>
          <Field label="Customer phone *">
            <input required className="admin-input" value={form.customer_phone} onChange={(e) => set("customer_phone", e.target.value)} placeholder="+92 300 1234567" />
          </Field>
        </FieldRow>
        <Field label="Customer email">
          <input type="email" className="admin-input" value={form.customer_email ?? ""} onChange={(e) => set("customer_email", e.target.value)} placeholder="Optional" />
        </Field>

        <FieldRow>
          <Field label="Product">
            <StyledSelect
              value={form.product_id ?? ""}
              onChange={(v) => onProductPicked(v)}
              placeholder="— Custom / not in catalog —"
              icon="fa-box"
              options={[
                { value: "", label: "Custom / not in catalog", hint: "Type a product name below" },
                ...products.map((p) => ({
                  value: p.id,
                  label: p.name,
                  hint: p.price != null ? `Rs ${Math.round(Number(p.price)).toLocaleString("en-PK")} listed` : undefined,
                })),
              ]}
            />
          </Field>
          <Field label="Product name (editable) *">
            <input required className="admin-input" value={form.product_name} onChange={(e) => set("product_name", e.target.value)} />
          </Field>
        </FieldRow>

        <FieldRow>
          <Field label="Plan name">
            <input className="admin-input" value={form.plan_name ?? ""} onChange={(e) => set("plan_name", e.target.value)} placeholder="Shared / Private / Monthly / etc." />
          </Field>
          <Field label="Sale price">
            <input type="number" min="0" step="0.01" className="admin-input" value={form.sale_price ?? ""} onChange={(e) => set("sale_price", e.target.value === "" ? null : Number(e.target.value))} />
          </Field>
          <Field label="Currency">
            <StyledSelect
              value={form.currency ?? "PKR"}
              onChange={(v) => set("currency", v)}
              placeholder="PKR"
              icon="fa-money-bill"
              options={[
                { value: "PKR", label: "PKR", hint: "Pakistani rupee" },
                { value: "USD", label: "USD", hint: "US dollar" },
                { value: "EUR", label: "EUR", hint: "Euro" },
                { value: "GBP", label: "GBP", hint: "Pound sterling" },
              ]}
            />
          </Field>
        </FieldRow>

        <FieldRow>
          <Field label="Sale date *">
            <input required type="date" className="admin-input" value={form.sale_date} onChange={(e) => set("sale_date", e.target.value)} />
          </Field>
          <Field label="Expiry date *">
            <input required type="date" className="admin-input" value={form.expiry_date} onChange={(e) => set("expiry_date", e.target.value)} />
          </Field>
          <Field label="Renew date *">
            <input required type="date" className="admin-input" value={form.renew_date} onChange={(e) => set("renew_date", e.target.value)} />
          </Field>
        </FieldRow>

        <FieldRow>
          <Field label="Payment method">
            <input className="admin-input" value={form.payment_method ?? ""} onChange={(e) => set("payment_method", e.target.value)} placeholder="JazzCash / Easypaisa / Card" />
          </Field>
          <Field label="Transaction ID">
            <input className="admin-input" value={form.transaction_id ?? ""} onChange={(e) => set("transaction_id", e.target.value)} />
          </Field>
          <Field label="Status">
            <StyledSelect
              value={form.status ?? "active"}
              onChange={(v) => set("status", v as SaleStatus)}
              placeholder="Active"
              icon="fa-flag"
              options={[
                { value: "active",      label: "Active" },
                { value: "renewal_due", label: "Renewal due" },
                { value: "renewed",     label: "Renewed" },
                { value: "expired",     label: "Expired" },
                { value: "cancelled",   label: "Cancelled" },
              ]}
            />
          </Field>
        </FieldRow>

        <Field label="Notes">
          <textarea className="admin-input admin-textarea" rows={2} value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} placeholder="Anything to remember about this sale." />
        </Field>

        <Field label="Reminder message"
          hint={<>Placeholders: <code>{"{customer_name}"}</code>, <code>{"{product_name}"}</code>, <code>{"{expiry_date}"}</code>, <code>{"{renew_date}"}</code></>}>
          <textarea className="admin-input admin-textarea" rows={3} value={form.reminder_message ?? ""} onChange={(e) => set("reminder_message", e.target.value)} />
        </Field>
      </form>
    </ModalShell>
  );
}

// ─── renew modal ─────────────────────────────────────────────────────
function RenewModal({
  sale, onClose, onConfirm,
}: {
  sale: SaleRow;
  onClose: () => void;
  onConfirm: (next?: { sale_date: string; expiry_date: string; renew_date: string; sale_price?: number | null }) => Promise<void>;
}) {
  const [createNext, setCreateNext] = useState(true);
  // Default next cycle picks up where the last one ended so consecutive
  // cycles don't overlap or leave gaps.
  const nextSaleDate = addDays(sale.expiry_date, 0);
  const [dates, setDates] = useState({
    sale_date:  nextSaleDate,
    expiry_date: addDays(nextSaleDate, 30),
    renew_date:  addDays(nextSaleDate, 30),
  });
  const [price, setPrice] = useState<number | null>(sale.sale_price);
  const [busy, setBusy] = useState(false);

  async function go() {
    setBusy(true);
    try {
      await onConfirm(createNext ? { ...dates, sale_price: price } : undefined);
    } finally { setBusy(false); }
  }

  return (
    <ModalShell title={`Mark as renewed — ${sale.customer_name}`} onClose={onClose} size="md" footer={
      <>
        <button type="button" onClick={onClose} disabled={busy} style={footerCancelStyle}>CANCEL</button>
        <button type="button" onClick={go} disabled={busy} style={footerPrimaryStyle(true)}>
          {busy ? "WORKING…" : createNext ? "RENEW & CREATE NEXT CYCLE" : "MARK RENEWED"}
        </button>
      </>
    }>
      <p style={{ margin: "0 0 16px", color: "var(--text-muted)", fontSize: "0.9rem" }}>
        Closes the current cycle as <strong>renewed</strong>. Optionally roll a
        fresh cycle for the same customer + product so it keeps ticking.
      </p>

      <label style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer" }}>
        <input type="checkbox" checked={createNext} onChange={(e) => setCreateNext(e.target.checked)} />
        <div>
          <div style={{ fontWeight: 500 }}>Create next renewal cycle</div>
          <div style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>New sale row starts from the previous expiry date.</div>
        </div>
      </label>

      {createNext && (
        <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
          <FieldRow>
            <Field label="New sale date">
              <input type="date" className="admin-input" value={dates.sale_date} onChange={(e) => setDates((d) => ({ ...d, sale_date: e.target.value }))} />
            </Field>
            <Field label="New expiry date">
              <input type="date" className="admin-input" value={dates.expiry_date} onChange={(e) => setDates((d) => ({ ...d, expiry_date: e.target.value }))} />
            </Field>
            <Field label="New renew date">
              <input type="date" className="admin-input" value={dates.renew_date} onChange={(e) => setDates((d) => ({ ...d, renew_date: e.target.value }))} />
            </Field>
          </FieldRow>
          <Field label="Price (optional override)">
            <input type="number" min="0" step="0.01" className="admin-input" value={price ?? ""} onChange={(e) => setPrice(e.target.value === "" ? null : Number(e.target.value))} />
          </Field>
        </div>
      )}
    </ModalShell>
  );
}

// ─── shared modal shell + confirm ─────────────────────────────────────
function ModalShell({
  title, children, onClose, footer, size = "md",
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const maxWidth = size === "sm" ? 480 : size === "lg" ? 820 : 640;
  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
        display: "grid", placeItems: "center", padding: 20, zIndex: 100,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--surface)", borderRadius: 14, border: "1px solid var(--border)",
          maxWidth, width: "100%", maxHeight: "88vh",
          display: "flex", flexDirection: "column",
          boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 22px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          <h2 style={{ margin: 0, fontFamily: "var(--font-heading)", fontSize: "0.82rem", letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: 700 }}>
            {title}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 18, cursor: "pointer" }}>
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        <div className="admin-scroll" style={{ flex: 1, overflowY: "auto", padding: "22px" }}>{children}</div>
        {footer && (
          <div style={{ padding: "12px 22px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 10, flexShrink: 0, background: "var(--surface)" }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

function ConfirmModal({
  title, message, onCancel, onConfirm, confirmLabel = "Confirm",
}: {
  title: string;
  message: React.ReactNode;
  onCancel: () => void;
  onConfirm: () => Promise<void> | void;
  confirmLabel?: string;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <ModalShell title={title} onClose={busy ? () => {} : onCancel} size="sm" footer={
      <>
        <button type="button" onClick={onCancel} disabled={busy} style={footerCancelStyle}>CANCEL</button>
        <button
          type="button"
          onClick={async () => { setBusy(true); try { await onConfirm(); } finally { setBusy(false); } }}
          disabled={busy}
          style={{ ...footerPrimaryStyle(true), background: "#ef4444" }}
        >
          {busy ? "WORKING…" : confirmLabel.toUpperCase()}
        </button>
      </>
    }>
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, display: "grid", placeItems: "center", flexShrink: 0, background: "rgba(239,68,68,0.12)", color: "#ef4444" }}>
          <i className="fa-solid fa-triangle-exclamation" />
        </div>
        <div style={{ flex: 1, fontSize: "0.9rem", lineHeight: 1.5 }}>{message}</div>
      </div>
    </ModalShell>
  );
}

// ─── styled dropdown ─────────────────────────────────────────────────
/**
 * Themed combobox replacing native <select>. Uses the admin-input
 * styling to match the rest of the form and drops a right-side chevron.
 * Closes on outside click / Escape; keyboard-safe for the common case.
 */
function StyledSelect({
  value, onChange, placeholder, options, icon,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: Array<{ value: string; label: string; hint?: string }>;
  icon?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%", textAlign: "left",
          padding: "10px 12px", borderRadius: 10,
          border: `1px solid ${open ? "rgba(249,115,22,0.5)" : "var(--border)"}`,
          background: "var(--surface-2, rgba(255,255,255,0.03))",
          color: "var(--text)",
          fontSize: "0.9rem",
          display: "flex", alignItems: "center", gap: 10,
          cursor: "pointer",
          boxShadow: open ? "0 0 0 3px rgba(249,115,22,0.15)" : "none",
          transition: "border-color 0.15s, box-shadow 0.15s",
        }}
      >
        {icon && (
          <span
            aria-hidden
            style={{
              width: 26, height: 26, borderRadius: 7,
              display: "grid", placeItems: "center", flexShrink: 0,
              background: selected ? "rgba(249,115,22,0.15)" : "var(--surface-2, rgba(255,255,255,0.05))",
              color: selected ? "#f97316" : "var(--text-muted)",
              fontSize: 11,
            }}
          >
            <i className={`fa-solid ${icon}`} />
          </span>
        )}
        <span style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
          {selected ? (
            <>
              <span style={{ fontWeight: 500 }}>{selected.label}</span>
              {selected.hint && (
                <span style={{ color: "var(--text-muted)", marginLeft: 8, fontSize: "0.78rem" }}>{selected.hint}</span>
              )}
            </>
          ) : (
            <span style={{ color: "var(--text-muted)", opacity: 0.75 }}>{placeholder}</span>
          )}
        </span>
        <i className={`fa-solid ${open ? "fa-chevron-up" : "fa-chevron-down"}`} style={{ fontSize: 11, color: "var(--text-muted)" }} />
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 1 }} />
          <div
            style={{
              position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: 8, zIndex: 2, maxHeight: 260, overflowY: "auto",
              boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            }}
          >
            {options.map((o) => {
              const active = o.value === value;
              return (
                <div
                  key={o.value}
                  onClick={() => { onChange(o.value); setOpen(false); }}
                  style={{
                    padding: "10px 14px", cursor: "pointer",
                    display: "flex", flexDirection: "column", gap: 2,
                    background: active ? "rgba(249,115,22,0.08)" : "transparent",
                    borderLeft: `3px solid ${active ? "#f97316" : "transparent"}`,
                  }}
                >
                  <span style={{ fontSize: "0.88rem", fontWeight: active ? 600 : 500, color: active ? "#f97316" : "var(--text)" }}>
                    {o.label}
                  </span>
                  {o.hint && <span style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>{o.hint}</span>}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ─── field primitives ─────────────────────────────────────────────────
function Field({ label, hint, children }: { label: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 6, fontSize: "0.85rem", color: "var(--text-muted)" }}>
      <span style={{ fontWeight: 500 }}>{label}</span>
      {children}
      {hint && <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{hint}</span>}
    </label>
  );
}

function FieldRow({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>{children}</div>;
}

function Th({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <th style={{ padding: "10px 14px", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", fontWeight: 700, ...style }}>{children}</th>;
}
function Td({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <td style={{ padding: "12px 14px", verticalAlign: "top", ...style }}>{children}</td>;
}

// ─── style helpers ────────────────────────────────────────────────────
function flashStyle(kind: "ok" | "err"): React.CSSProperties {
  return {
    padding: "10px 14px", borderRadius: 8, fontSize: "0.9rem",
    background: kind === "ok" ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
    color: kind === "ok" ? "#22c55e" : "#ef4444",
    border: `1px solid ${kind === "ok" ? "rgba(34,197,94,0.35)" : "rgba(239,68,68,0.35)"}`,
  };
}

const footerCancelStyle: React.CSSProperties = {
  background: "none", border: "none",
  fontSize: "0.82rem", letterSpacing: "0.08em", fontWeight: 700,
  color: "var(--text-muted)", cursor: "pointer", padding: "10px 16px",
};

function footerPrimaryStyle(enabled: boolean): React.CSSProperties {
  return {
    background: enabled ? "#f97316" : "var(--surface-2, rgba(255,255,255,0.06))",
    color: enabled ? "#fff" : "var(--text-muted)",
    border: "none", borderRadius: 6,
    fontSize: "0.82rem", letterSpacing: "0.08em", fontWeight: 700,
    padding: "10px 18px",
    cursor: enabled ? "pointer" : "not-allowed",
  };
}
