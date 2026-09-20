"use client";

/**
 * Deleted Sales — the recycle bin for Daily Sales.
 *
 * A deleted sale keeps its row with deleted_at stamped, so it stays out of the
 * live list, revenue and the renewal sweep while remaining recoverable here.
 * Permanent removal is only reachable from this page.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { purgeSubscriptionSale, restoreSubscriptionSale, type SaleRow } from "../actions";
import {
  ConfirmModal,
  IconBtn,
  Pill,
  StatCard,
  Td,
  Th,
  flashStyle,
} from "../../delivery/ui";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

function fmtMoney(amount: number | null, currency: string): string {
  if (amount == null) return "—";
  return `${Number(amount).toLocaleString("en-PK")} ${currency || "PKR"}`;
}

export default function DeletedSalesClient({
  initialSales,
  canManage,
}: {
  initialSales: SaleRow[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [sales, setSales] = useState(initialSales);
  const [search, setSearch] = useState("");
  const [flash, setFlash] = useState<{ kind: "ok" | "err" | "warn"; msg: string } | null>(null);
  const [confirmPurge, setConfirmPurge] = useState<SaleRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function notify(kind: "ok" | "err" | "warn", msg: string) {
    setFlash({ kind, msg });
    setTimeout(() => setFlash(null), 5000);
  }

  const stats = useMemo(() => {
    const value = sales.reduce((a, s) => a + Number(s.sale_price ?? 0), 0);
    const monthKey = new Date().toISOString().slice(0, 7);
    const thisMonth = sales.filter((s) => (s.deleted_at ?? "").slice(0, 7) === monthKey).length;
    return { total: sales.length, value, thisMonth };
  }, [sales]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sales;
    return sales.filter((s) =>
      [s.customer_name, s.customer_phone, s.customer_email, s.product_name, s.delete_reason]
        .filter(Boolean).join(" ").toLowerCase().includes(q),
    );
  }, [sales, search]);

  async function restore(row: SaleRow) {
    setBusyId(row.id);
    const res = await restoreSubscriptionSale(row.id);
    setBusyId(null);
    if (!res.ok) { notify("err", res.error); return; }
    setSales((prev) => prev.filter((s) => s.id !== row.id));
    notify("ok", `${row.customer_name}'s ${row.product_name} sale is back in Daily Sales.`);
    router.refresh();
  }

  async function purge(row: SaleRow) {
    setBusyId(row.id);
    const res = await purgeSubscriptionSale(row.id);
    setBusyId(null);
    if (!res.ok) { notify("err", res.error); return; }
    setSales((prev) => prev.filter((s) => s.id !== row.id));
    notify("ok", "Sale permanently removed.");
    router.refresh();
  }

  return (
    <div>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18, gap: 16, flexWrap: "wrap" }}>
        <div>
          <p style={{ margin: 0 }}>
            <Link href="/admin/sales" style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>← Daily sales</Link>
          </p>
          <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "1.65rem", margin: "0 0 4px" }}>Deleted sales</h1>
          <p style={{ color: "var(--text-muted)", margin: 0, fontSize: "0.92rem" }}>
            Removed from Daily Sales, revenue and renewal reminders — but recoverable until you delete them for good.
          </p>
        </div>
        <Link href="/admin/sales" className="admin-btn admin-btn-ghost">
          <i className="fa-solid fa-hand-holding-dollar" style={{ marginRight: 6 }} /> Completed sales
        </Link>
      </header>

      {flash && <div style={{ ...flashStyle(flash.kind), marginBottom: 14 }}>{flash.msg}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 18 }}>
        <StatCard icon="fa-trash" tone="danger" label="Deleted sales" value={stats.total} />
        <StatCard icon="fa-calendar-xmark" tone="warn" label="Deleted this month" value={stats.thisMonth} />
        <StatCard icon="fa-wallet" tone="brand" label="Value removed (PKR)" value={stats.value.toLocaleString("en-PK")} />
      </div>

      {sales.length > 0 && (
        <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
          <input
            className="admin-input"
            placeholder="Search customer, product, or reason…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search deleted sales"
            style={{ flex: "1 1 280px", minWidth: 220, maxWidth: 420 }}
          />
        </div>
      )}

      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        {rows.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-muted)" }}>
            <i className="fa-solid fa-trash-can" style={{ fontSize: 28, marginBottom: 10, display: "block" }} />
            <div style={{ fontWeight: 600, color: "var(--text)" }}>
              {search ? "No deleted sale matches your search" : "Nothing deleted"}
            </div>
            {!search && (
              <div style={{ fontSize: "0.85rem", marginTop: 4 }}>
                Sales you delete from{" "}
                <Link href="/admin/sales" style={{ color: "#4884FF" }}>Daily sales</Link> land here first.
              </div>
            )}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
              <thead>
                <tr style={{ background: "var(--surface-2, rgba(255,255,255,0.03))" }}>
                  <Th>Customer</Th>
                  <Th>Product</Th>
                  <Th>Amount</Th>
                  <Th>Original sale date</Th>
                  <Th>Deleted</Th>
                  <Th style={{ textAlign: "right" }}>Actions</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} style={{ borderTop: "1px solid var(--border)" }}>
                    <Td>
                      <div style={{ fontWeight: 500 }}>{row.customer_name}</div>
                      <div style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>{row.customer_phone}</div>
                    </Td>
                    <Td>
                      <div>{row.product_name}</div>
                      {row.plan_name && (
                        <div style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>{row.plan_name}</div>
                      )}
                    </Td>
                    <Td style={{ whiteSpace: "nowrap" }}>{fmtMoney(row.sale_price, row.currency)}</Td>
                    <Td style={{ whiteSpace: "nowrap" }}>{fmtDate(row.sale_date)}</Td>
                    <Td style={{ whiteSpace: "nowrap" }}>
                      {fmtDate(row.deleted_at)}
                      {row.delete_reason && (
                        <div style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginTop: 3, maxWidth: 220, whiteSpace: "normal" }}>
                          {row.delete_reason}
                        </div>
                      )}
                      {!row.delete_reason && (
                        <div style={{ marginTop: 3 }}><Pill tone="neutral">NO REASON GIVEN</Pill></div>
                      )}
                    </Td>
                    <Td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      {canManage ? (
                        <div style={{ display: "inline-flex", gap: 6 }}>
                          <button
                            type="button"
                            className="admin-btn admin-btn-ghost"
                            style={{ padding: "6px 12px" }}
                            onClick={() => restore(row)}
                            disabled={busyId === row.id}
                          >
                            <i className="fa-solid fa-rotate-left" style={{ marginRight: 6 }} />
                            {busyId === row.id ? "Working…" : "Restore"}
                          </button>
                          <IconBtn
                            icon="fa-trash"
                            title="Delete permanently"
                            color="#F54848"
                            onClick={() => setConfirmPurge(row)}
                            disabled={busyId === row.id}
                          />
                        </div>
                      ) : (
                        <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>View only</span>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {confirmPurge && (
        <ConfirmModal
          title="Delete this sale permanently?"
          confirmLabel="Delete forever"
          message={
            <>
              <strong>{confirmPurge.customer_name}</strong>&apos;s {confirmPurge.product_name} sale for{" "}
              {fmtMoney(confirmPurge.sale_price, confirmPurge.currency)} will be erased from the database. This can&apos;t
              be undone and the row won&apos;t be recoverable. Restore it instead if you&apos;re unsure.
            </>
          }
          onCancel={() => setConfirmPurge(null)}
          onConfirm={async () => {
            const row = confirmPurge;
            setConfirmPurge(null);
            await purge(row);
          }}
        />
      )}
    </div>
  );
}
