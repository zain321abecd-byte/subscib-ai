"use client";

/**
 * Email logs — every message the system attempted, and what became of it.
 *
 * The SMTP panel at the top is the first thing to look at when mail stops
 * arriving: it says what the server is actually configured with and whether a
 * connection can even be opened.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  diagnoseSmtp,
  retryFailedEmail,
  type EmailLogRow,
  type EmailLogStatus,
  type SmtpDiagnosis,
} from "./actions";
import {
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
} from "../../delivery/ui";

const TYPE_LABELS: Record<string, string> = {
  transactional: "Transactional",
  promotion: "Promotion",
  verification: "Verification",
  welcome: "Welcome",
  order_confirmation: "Order confirmation",
  admin_order_alert: "Admin order alert",
  request_ack: "Request acknowledgement",
  admin_request_alert: "Admin request alert",
};

function typeLabel(value: string): string {
  return TYPE_LABELS[value] || value.replace(/_/g, " ");
}

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

export default function EmailLogsClient({
  initialLogs,
  canSend,
}: {
  initialLogs: EmailLogRow[];
  canSend: boolean;
}) {
  const router = useRouter();
  const [logs, setLogs] = useState(initialLogs);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<EmailLogStatus | "all">("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [flash, setFlash] = useState<{ kind: "ok" | "err" | "warn"; msg: string } | null>(null);
  const [viewing, setViewing] = useState<EmailLogRow | null>(null);
  const [diagnosis, setDiagnosis] = useState<SmtpDiagnosis | null>(null);
  const [checking, setChecking] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  function notify(kind: "ok" | "err" | "warn", msg: string) {
    setFlash({ kind, msg });
    setTimeout(() => setFlash(null), 6000);
  }

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    let sent = 0, failed = 0, pending = 0, sentToday = 0;
    for (const l of logs) {
      if (l.status === "sent") { sent++; if ((l.sent_at || l.created_at).slice(0, 10) === today) sentToday++; }
      if (l.status === "failed") failed++;
      if (l.status === "pending") pending++;
    }
    return { total: logs.length, sent, failed, pending, sentToday };
  }, [logs]);

  const types = useMemo(() => [...new Set(logs.map((l) => l.email_type))].sort(), [logs]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return logs.filter((l) => {
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      if (typeFilter !== "all" && l.email_type !== typeFilter) return false;
      if (q && ![l.recipient_email, l.subject, l.email_type, l.error_message].filter(Boolean).join(" ").toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [logs, search, statusFilter, typeFilter]);

  async function runDiagnosis() {
    setChecking(true);
    const res = await diagnoseSmtp();
    setChecking(false);
    setDiagnosis(res);
  }

  async function retry(row: EmailLogRow) {
    setBusyId(row.id);
    const res = await retryFailedEmail(row.id);
    setBusyId(null);
    if (!res.ok) { notify("err", res.error); return; }
    notify("ok", `Retry sent to ${row.recipient_email}.`);
    router.refresh();
  }

  return (
    <div>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18, gap: 16, flexWrap: "wrap" }}>
        <div>
          <p style={{ margin: 0 }}>
            <Link href="/admin/email" style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>← Emails</Link>
          </p>
          <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "1.65rem", margin: "0 0 4px" }}>Email logs</h1>
          <p style={{ color: "var(--text-muted)", margin: 0, fontSize: "0.92rem" }}>
            Every email the system attempted, and whether it left the building.
          </p>
        </div>
        <button className="admin-btn admin-btn-ghost" onClick={runDiagnosis} disabled={checking}>
          <i className="fa-solid fa-plug-circle-check" style={{ marginRight: 6 }} />
          {checking ? "Checking…" : "Test SMTP connection"}
        </button>
      </header>

      {flash && <div style={{ ...flashStyle(flash.kind), marginBottom: 14 }}>{flash.msg}</div>}

      {diagnosis && (
        <div style={{ ...flashStyle(diagnosis.ok ? "ok" : "err"), marginBottom: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>
            {diagnosis.ok ? "SMTP connection OK" : "SMTP connection failed"}
          </div>
          <div style={{ fontSize: "0.86rem", lineHeight: 1.55 }}>{diagnosis.detail}</div>
          {diagnosis.reachable && (
            <div style={{ fontSize: "0.8rem", marginTop: 10, opacity: 0.85 }}>
              host <code>{diagnosis.config.host || "(unset)"}</code> · port <code>{diagnosis.config.port}</code> ·{" "}
              {diagnosis.config.secure ? "SSL/TLS" : "STARTTLS"} · user <code>{diagnosis.config.user || "(unset)"}</code> ·
              from <code>{diagnosis.config.from || "(unset)"}</code>
              {diagnosis.config.replyTo ? <> · reply-to <code>{diagnosis.config.replyTo}</code></> : null}
            </div>
          )}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12, marginBottom: 18 }}>
        <StatCard icon="fa-envelope" tone="brand" label="Logged" value={stats.total} />
        <StatCard icon="fa-circle-check" tone="ok" label="Sent" value={stats.sent} />
        <StatCard icon="fa-paper-plane" tone="brand" label="Sent today" value={stats.sentToday} />
        <StatCard icon="fa-circle-exclamation" tone="danger" label="Failed" value={stats.failed} />
        <StatCard icon="fa-hourglass-half" tone="warn" label="Pending" value={stats.pending} />
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        <input
          className="admin-input"
          placeholder="Search recipient, subject, type, or error…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search email logs"
          style={{ flex: "1 1 260px", minWidth: 200 }}
        />
        <div style={{ minWidth: 165, maxWidth: 190 }}>
          <StyledSelect
            value={statusFilter}
            onChange={(v) => setStatusFilter(v as EmailLogStatus | "all")}
            placeholder="All statuses"
            icon="fa-filter"
            options={[
              { value: "all", label: "All statuses" },
              { value: "sent", label: "Sent" },
              { value: "failed", label: "Failed" },
              { value: "pending", label: "Pending" },
            ]}
          />
        </div>
        <div style={{ minWidth: 190, maxWidth: 230 }}>
          <StyledSelect
            value={typeFilter}
            onChange={setTypeFilter}
            placeholder="All types"
            icon="fa-tag"
            options={[{ value: "all", label: "All types" }, ...types.map((t) => ({ value: t, label: typeLabel(t) }))]}
          />
        </div>
      </div>

      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        {rows.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-muted)" }}>
            <i className="fa-solid fa-envelope-open" style={{ fontSize: 28, marginBottom: 10, display: "block" }} />
            <div style={{ fontWeight: 600, color: "var(--text)" }}>
              {logs.length === 0 ? "No emails logged yet" : "No entries match your filters"}
            </div>
            {logs.length === 0 && (
              <div style={{ fontSize: "0.85rem", marginTop: 4 }}>
                Run <code>26-email-logs.sql</code> if you haven&apos;t — without that table the backend logs nothing.
              </div>
            )}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
              <thead>
                <tr style={{ background: "var(--surface-2, rgba(255,255,255,0.03))" }}>
                  <Th>Date</Th>
                  <Th>Email</Th>
                  <Th>Type</Th>
                  <Th>Subject</Th>
                  <Th>Status</Th>
                  <Th style={{ textAlign: "right" }}>Actions</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} style={{ borderTop: "1px solid var(--border)" }}>
                    <Td style={{ whiteSpace: "nowrap" }}>{fmtWhen(row.sent_at || row.created_at)}</Td>
                    <Td style={{ wordBreak: "break-all" }}>{row.recipient_email}</Td>
                    <Td><Pill tone="neutral">{typeLabel(row.email_type)}</Pill></Td>
                    <Td style={{ maxWidth: 260 }}>{row.subject || "—"}</Td>
                    <Td>
                      <StatusBadge status={row.status} />
                      {row.error_message && (
                        <div style={{ color: "#F54848", fontSize: "0.72rem", marginTop: 4, maxWidth: 240 }}>
                          {row.error_message.slice(0, 90)}
                          {row.error_message.length > 90 ? "…" : ""}
                        </div>
                      )}
                    </Td>
                    <Td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <div style={{ display: "inline-flex", gap: 6 }}>
                        <IconBtn icon="fa-eye" title="View details" onClick={() => setViewing(row)} />
                        {canSend && row.status === "failed" && (
                          <IconBtn
                            icon="fa-rotate-right"
                            title="Retry"
                            color="#4884FF"
                            onClick={() => retry(row)}
                            disabled={busyId === row.id}
                          />
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

      {viewing && (
        <ModalShell
          title={`${typeLabel(viewing.email_type)} → ${viewing.recipient_email}`}
          size="md"
          onClose={() => setViewing(null)}
          footer={<button type="button" style={footerCancelStyle} onClick={() => setViewing(null)}>CLOSE</button>}
        >
          <dl style={{ display: "grid", gridTemplateColumns: "max-content 1fr", gap: "8px 18px", margin: 0, fontSize: "0.88rem" }}>
            <dt style={{ color: "var(--text-muted)" }}>Status</dt>
            <dd style={{ margin: 0 }}><StatusBadge status={viewing.status} /></dd>
            <dt style={{ color: "var(--text-muted)" }}>Recipient</dt>
            <dd style={{ margin: 0, wordBreak: "break-all" }}>{viewing.recipient_email}</dd>
            <dt style={{ color: "var(--text-muted)" }}>Subject</dt>
            <dd style={{ margin: 0 }}>{viewing.subject || "—"}</dd>
            <dt style={{ color: "var(--text-muted)" }}>Queued</dt>
            <dd style={{ margin: 0 }}>{fmtWhen(viewing.created_at)}</dd>
            <dt style={{ color: "var(--text-muted)" }}>Sent</dt>
            <dd style={{ margin: 0 }}>{fmtWhen(viewing.sent_at)}</dd>
            <dt style={{ color: "var(--text-muted)" }}>Provider</dt>
            <dd style={{ margin: 0 }}>{viewing.provider || "—"}</dd>
            {viewing.provider_message_id && (<>
              <dt style={{ color: "var(--text-muted)" }}>Message id</dt>
              <dd style={{ margin: 0 }}><code style={{ fontSize: "0.8em", wordBreak: "break-all" }}>{viewing.provider_message_id}</code></dd>
            </>)}
            {viewing.related_order_id && (<>
              <dt style={{ color: "var(--text-muted)" }}>Order</dt>
              <dd style={{ margin: 0 }}>
                <Link href={`/admin/orders/${viewing.related_order_id}`} style={{ color: "#4884FF" }}>View order</Link>
              </dd>
            </>)}
          </dl>

          {viewing.error_message && (
            <div style={{ ...flashStyle("err"), marginTop: 16, fontSize: "0.85rem", lineHeight: 1.55 }}>
              {viewing.error_message}
            </div>
          )}
        </ModalShell>
      )}
    </div>
  );
}
