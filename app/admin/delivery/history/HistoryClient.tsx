"use client";

/**
 * Delivery history — every message the shop has sent (or tried to send), with
 * view / copy / resend. The message body is kept hidden behind an explicit
 * "Reveal" click because it contains the account credentials that went out.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  KIND_LABELS,
  formatPhone,
  languageLabel,
  waLink,
  type DeliveryMessageRow,
  type MessageKind,
  type MessageStatus,
} from "@/lib/delivery";
import { resendDeliveryMessage } from "../actions";
import {
  ConfirmModal,
  CopyButton,
  IconBtn,
  ModalShell,
  Pill,
  StatCard,
  StatusBadge,
  StyledSelect,
  Td,
  Th,
  flashStyle,
  footerCancelStyle,
} from "../ui";

const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: "WhatsApp",
  manual: "WhatsApp (manual)",
  email: "Email",
};

function fmtWhen(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function HistoryClient({
  initialMessages,
  canSend,
}: {
  initialMessages: DeliveryMessageRow[];
  canSend: boolean;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState(initialMessages);
  const [flash, setFlash] = useState<{ kind: "ok" | "err" | "warn"; msg: string } | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<MessageStatus | "all">("all");
  const [kindFilter, setKindFilter] = useState<MessageKind | "all">("all");
  const [viewing, setViewing] = useState<DeliveryMessageRow | null>(null);
  const [confirmResend, setConfirmResend] = useState<DeliveryMessageRow | null>(null);

  function notify(kind: "ok" | "err" | "warn", msg: string) {
    setFlash({ kind, msg });
    setTimeout(() => setFlash(null), 5000);
  }

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    let sentToday = 0, pending = 0, failed = 0;
    for (const m of messages) {
      if (m.status === "sent" && m.created_at.slice(0, 10) === today) sentToday++;
      if (m.status === "pending") pending++;
      if (m.status === "failed") failed++;
    }
    return { total: messages.length, sentToday, pending, failed };
  }, [messages]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return messages.filter((m) => {
      if (statusFilter !== "all" && m.status !== statusFilter) return false;
      if (kindFilter !== "all" && m.kind !== kindFilter) return false;
      if (q) {
        const hay = [m.customer_name, m.customer_phone, m.customer_email, m.product_name, m.template_name, m.sent_by_email]
          .filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [messages, search, statusFilter, kindFilter]);

  async function resend(row: DeliveryMessageRow) {
    const res = await resendDeliveryMessage(row.id);
    if (!res.ok) { notify("err", res.error); return; }
    const data = res.data!;
    if (data.log) setMessages((prev) => [data.log as DeliveryMessageRow, ...prev]);
    if (data.status === "sent") notify("ok", `Resent to ${formatPhone(row.customer_phone)}.`);
    else if (data.channel === "manual") notify("warn", "Logged again — open WhatsApp from the row to send it.");
    else notify("err", data.error || "Resend failed.");
    router.refresh();
  }

  return (
    <div>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18, gap: 16, flexWrap: "wrap" }}>
        <div>
          <p style={{ margin: 0 }}>
            <Link href="/admin/delivery" style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>← Delivery automation</Link>
          </p>
          <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "1.65rem", margin: "0 0 4px" }}>Delivery history</h1>
          <p style={{ color: "var(--text-muted)", margin: 0, fontSize: "0.92rem" }}>
            Every delivery message, reminder, and expiry notice — who sent it, when, and whether it landed.
          </p>
        </div>
        <Link href="/admin/delivery" className="admin-btn admin-btn-primary">
          <i className="fa-brands fa-whatsapp" style={{ marginRight: 6 }} /> New delivery
        </Link>
      </header>

      {flash && <div style={{ ...flashStyle(flash.kind), marginBottom: 14 }}>{flash.msg}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 18 }}>
        <StatCard icon="fa-paper-plane"      tone="brand"  label="Messages logged" value={stats.total} />
        <StatCard icon="fa-circle-check"     tone="ok"     label="Sent today"      value={stats.sentToday} />
        <StatCard icon="fa-hourglass-half"   tone="warn"   label="Pending"         value={stats.pending} />
        <StatCard icon="fa-circle-exclamation" tone="danger" label="Failed"        value={stats.failed} />
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        <input
          className="admin-input"
          placeholder="Search customer, phone, product, template, admin…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: "1 1 280px", minWidth: 220 }}
        />
        <div style={{ minWidth: 170, maxWidth: 200 }}>
          <StyledSelect
            value={statusFilter}
            onChange={(v) => setStatusFilter(v as MessageStatus | "all")}
            placeholder="All statuses"
            icon="fa-filter"
            options={[
              { value: "all", label: "All statuses" },
              { value: "sent", label: "Sent" },
              { value: "pending", label: "Pending" },
              { value: "failed", label: "Failed" },
            ]}
          />
        </div>
        <div style={{ minWidth: 200, maxWidth: 230 }}>
          <StyledSelect
            value={kindFilter}
            onChange={(v) => setKindFilter(v as MessageKind | "all")}
            placeholder="All message types"
            icon="fa-tag"
            options={[
              { value: "all", label: "All message types" },
              { value: "delivery", label: KIND_LABELS.delivery },
              { value: "renewal_reminder", label: KIND_LABELS.renewal_reminder },
              { value: "expiry_notice", label: KIND_LABELS.expiry_notice },
            ]}
          />
        </div>
      </div>

      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        {rows.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-muted)" }}>
            <i className="fa-solid fa-inbox" style={{ fontSize: 28, marginBottom: 10, display: "block" }} />
            <div style={{ fontWeight: 600, color: "var(--text)" }}>
              {messages.length === 0 ? "Nothing sent yet" : "No messages match your filters"}
            </div>
            <div style={{ fontSize: "0.85rem", marginTop: 4 }}>
              {messages.length === 0
                ? <>Deliver a subscription from <Link href="/admin/delivery" style={{ color: "#4884FF" }}>Delivery automation</Link>.</>
                : "Try clearing the search or filters."}
            </div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
              <thead>
                <tr style={{ background: "var(--surface-2, rgba(255,255,255,0.03))" }}>
                  <Th>Customer</Th>
                  <Th>Phone</Th>
                  <Th>Subscription</Th>
                  <Th>Sent</Th>
                  <Th>Template</Th>
                  <Th>Status</Th>
                  <Th>Sent by</Th>
                  <Th style={{ textAlign: "right" }}>Actions</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} style={{ borderTop: "1px solid var(--border)" }}>
                    <Td>
                      <div style={{ fontWeight: 500 }}>{row.customer_name || "—"}</div>
                      {row.customer_email && (
                        <div style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>{row.customer_email}</div>
                      )}
                    </Td>
                    <Td style={{ whiteSpace: "nowrap" }}>{formatPhone(row.customer_phone)}</Td>
                    <Td>
                      <div>{row.product_name}</div>
                      <div style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>
                        {KIND_LABELS[row.kind]} · {CHANNEL_LABELS[row.channel] || row.channel}
                      </div>
                    </Td>
                    <Td style={{ whiteSpace: "nowrap" }}>
                      {fmtWhen(row.sent_at || row.created_at)}
                      {row.order_id && (
                        <div style={{ fontSize: "0.75rem", marginTop: 2 }}>
                          <Link href={`/admin/orders/${row.order_id}`} style={{ color: "var(--brand-300, #8FB4FF)" }}>order →</Link>
                        </div>
                      )}
                    </Td>
                    <Td>
                      <div>{row.template_name || "Custom wording"}</div>
                      <div style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>{languageLabel(row.language)}</div>
                    </Td>
                    <Td>
                      <StatusBadge status={row.status} />
                      {row.error && (
                        <div style={{ color: "#F54848", fontSize: "0.72rem", marginTop: 4, maxWidth: 220 }}>{row.error}</div>
                      )}
                    </Td>
                    <Td style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                      {row.sent_by_email === "automation"
                        ? <Pill tone="brand">AUTOMATION</Pill>
                        : row.sent_by_email || "—"}
                    </Td>
                    <Td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <div style={{ display: "inline-flex", gap: 6 }}>
                        <IconBtn icon="fa-eye" title="View message" onClick={() => setViewing(row)} />
                        <CopyButton compact text={row.message_body} label="Copy message" />
                        {row.channel !== "email" && (
                          <a
                            href={waLink(row.customer_phone, row.message_body)}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Open in WhatsApp"
                            aria-label="Open in WhatsApp"
                            style={{
                              width: 30, height: 30, borderRadius: 6, display: "grid", placeItems: "center",
                              border: "1px solid var(--border)", color: "#22c55e", fontSize: 12,
                            }}
                          >
                            <i className="fa-brands fa-whatsapp" />
                          </a>
                        )}
                        {canSend && (
                          <IconBtn icon="fa-rotate-right" title="Resend" color="#4884FF" onClick={() => setConfirmResend(row)} />
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

      {viewing && <MessageModal row={viewing} onClose={() => setViewing(null)} />}

      {confirmResend && (
        <ConfirmModal
          title="Resend this message?"
          danger={false}
          confirmLabel="Resend"
          message={
            <>
              The same message — including the credentials it contains — goes out again to{" "}
              <strong>{formatPhone(confirmResend.customer_phone)}</strong>. A new history row is logged.
            </>
          }
          onCancel={() => setConfirmResend(null)}
          onConfirm={async () => {
            const row = confirmResend;
            setConfirmResend(null);
            await resend(row);
          }}
        />
      )}
    </div>
  );
}

/**
 * Message viewer. The body starts hidden: this log holds the account
 * credentials that were sent, and an admin scrolling through history on a
 * shared screen shouldn't have them on display by default.
 */
function MessageModal({ row, onClose }: { row: DeliveryMessageRow; onClose: () => void }) {
  const [revealed, setRevealed] = useState(false);

  return (
    <ModalShell
      title={`${KIND_LABELS[row.kind]} — ${row.product_name}`}
      size="md"
      onClose={onClose}
      footer={
        <>
          <button type="button" style={footerCancelStyle} onClick={onClose}>CLOSE</button>
          <CopyButton text={row.message_body} />
        </>
      }
    >
      <dl style={{ display: "grid", gridTemplateColumns: "max-content 1fr", gap: "8px 18px", margin: "0 0 16px", fontSize: "0.86rem" }}>
        <dt style={{ color: "var(--text-muted)" }}>Customer</dt>
        <dd style={{ margin: 0 }}>{row.customer_name || "—"}</dd>
        <dt style={{ color: "var(--text-muted)" }}>Phone</dt>
        <dd style={{ margin: 0 }}>{formatPhone(row.customer_phone)}</dd>
        {row.customer_email && (<>
          <dt style={{ color: "var(--text-muted)" }}>Email</dt>
          <dd style={{ margin: 0 }}>{row.customer_email}</dd>
        </>)}
        <dt style={{ color: "var(--text-muted)" }}>Channel</dt>
        <dd style={{ margin: 0 }}>{CHANNEL_LABELS[row.channel] || row.channel}{row.provider ? ` · ${row.provider}` : ""}</dd>
        <dt style={{ color: "var(--text-muted)" }}>Status</dt>
        <dd style={{ margin: 0 }}><StatusBadge status={row.status} /></dd>
        <dt style={{ color: "var(--text-muted)" }}>Created</dt>
        <dd style={{ margin: 0 }}>{fmtWhen(row.created_at)}</dd>
        {row.sent_at && (<>
          <dt style={{ color: "var(--text-muted)" }}>Sent</dt>
          <dd style={{ margin: 0 }}>{fmtWhen(row.sent_at)}</dd>
        </>)}
        <dt style={{ color: "var(--text-muted)" }}>Sent by</dt>
        <dd style={{ margin: 0 }}>{row.sent_by_email || "—"}</dd>
        <dt style={{ color: "var(--text-muted)" }}>Template</dt>
        <dd style={{ margin: 0 }}>{row.template_name || "Custom wording"} · {languageLabel(row.language)}</dd>
        {row.provider_message_id && (<>
          <dt style={{ color: "var(--text-muted)" }}>Provider id</dt>
          <dd style={{ margin: 0 }}><code style={{ fontSize: "0.8em" }}>{row.provider_message_id}</code></dd>
        </>)}
      </dl>

      {row.error && <div style={{ ...flashStyle("err"), marginBottom: 12, fontSize: "0.82rem" }}>{row.error}</div>}

      {revealed ? (
        <div
          className="admin-scroll"
          style={{
            background: "#075E54", color: "#fff", borderRadius: "10px 10px 10px 2px",
            padding: "10px 12px", fontSize: "0.86rem", lineHeight: 1.55,
            whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: 360, overflowY: "auto",
          }}
        >
          {row.message_body}
        </div>
      ) : (
        <div style={{ border: "1px dashed var(--border)", borderRadius: 10, padding: "22px 16px", textAlign: "center" }}>
          <i className="fa-solid fa-eye-slash" style={{ fontSize: 22, color: "var(--text-muted)", display: "block", marginBottom: 8 }} />
          <p style={{ margin: "0 0 12px", color: "var(--text-muted)", fontSize: "0.85rem" }}>
            This message contains the account credentials that were sent.
          </p>
          <button type="button" className="admin-btn admin-btn-ghost" onClick={() => setRevealed(true)}>
            <i className="fa-solid fa-eye" style={{ marginRight: 6 }} /> Reveal message
          </button>
        </div>
      )}
    </ModalShell>
  );
}
