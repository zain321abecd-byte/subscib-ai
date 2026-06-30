"use client";

import { useState } from "react";
import { sendPromotion, sendTestEmail, type Audience } from "./actions";

type Status = { provider: string; configured: boolean; from: string; replyTo: string };

const DEFAULT_HTML = "<p>Here is the latest SubscribAI update.</p>";

export default function EmailClient({
  status,
  counts,
  canSend,
}: {
  status: Status;
  counts: { subscribers: number; customers: number };
  canSend: boolean;
}) {
  const [subject, setSubject] = useState("SubscribAI update");
  const [html, setHtml] = useState(DEFAULT_HTML);
  const [text, setText] = useState("");
  const [audience, setAudience] = useState<Audience>("subscribers");
  const [manual, setManual] = useState("");
  const [testTo, setTestTo] = useState("");
  const [busy, setBusy] = useState<"" | "test" | "send">("");
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const disabled = !canSend || !status.configured || busy !== "";

  const audienceCount =
    audience === "subscribers" ? counts.subscribers : audience === "customers" ? counts.customers : null;

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }

  async function onSendTest() {
    setError(null);
    setBusy("test");
    try {
      const res = await sendTestEmail({ to: testTo, subject, html, text: text || undefined });
      if (!res.ok) throw new Error(res.error);
      flash(`Test email sent to ${testTo}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send test.");
    } finally {
      setBusy("");
    }
  }

  async function onSendAll() {
    setError(null);
    const label =
      audience === "manual" ? "the addresses you entered" : `all ${audienceCount ?? 0} ${audience}`;
    if (!confirm(`Send this promotional email to ${label}? This cannot be undone.`)) return;
    setBusy("send");
    try {
      const res = await sendPromotion({ audience, manual, subject, html, text: text || undefined });
      if (!res.ok) throw new Error(res.error);
      flash(`Sent to ${res.sent ?? 0} of ${res.total ?? 0} recipients${res.failed ? ` (${res.failed} failed)` : ""}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send.");
    } finally {
      setBusy("");
    }
  }

  return (
    <>
      <header className="admin-page-head">
        <div>
          <h1>Emails / Promotions</h1>
          <p>Send a promotional email to your subscribers, customers, or a custom list.</p>
        </div>
      </header>

      {toast && <div style={toastStyle}>{toast}</div>}
      {error && <div style={errorStyle}>{error}</div>}

      {/* Status */}
      <section className="admin-card" style={{ marginBottom: 18 }}>
        <h2 style={cardTitle}>Email settings status</h2>
        <div style={{ display: "grid", gap: 6, fontSize: 14, color: "var(--text-soft)" }}>
          <Row label="Status">
            <span style={{ color: status.configured ? "#34d399" : "var(--danger-500, #f87171)", fontWeight: 600 }}>
              {status.configured ? "Configured" : "Not configured"}
            </span>
          </Row>
          <Row label="Provider">{status.provider}</Row>
          <Row label="From">{status.from || "—"}</Row>
          <Row label="Reply-to">{status.replyTo || "—"}</Row>
        </div>
        {!status.configured && (
          <p style={{ marginTop: 10, fontSize: 13, color: "var(--text-muted)" }}>
            Set <code>SMTP_HOST</code>, <code>SMTP_USER</code>, <code>SMTP_PASS</code> and{" "}
            <code>EMAIL_FROM</code> in the server environment to enable sending.
          </p>
        )}
      </section>

      {/* Compose */}
      <section className="admin-card">
        <h2 style={cardTitle}>Promotional email</h2>

        {!canSend && (
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 0 }}>
            You have read-only access. The <code>emails:send</code> permission is required to send.
          </p>
        )}

        <label style={label}>Subject</label>
        <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} style={{ width: "100%" }} maxLength={180} />

        <label style={label}>HTML body</label>
        <textarea className="input" value={html} onChange={(e) => setHtml(e.target.value)} rows={8} style={{ width: "100%", fontFamily: "var(--font-mono, monospace)", fontSize: 13 }} />

        <label style={label}>Plain-text fallback <span style={{ color: "var(--text-muted)", textTransform: "none", letterSpacing: 0 }}>(optional)</span></label>
        <textarea className="input" value={text} onChange={(e) => setText(e.target.value)} rows={3} style={{ width: "100%" }} placeholder="Auto-generated from the HTML if left blank." />

        <label style={label}>Audience</label>
        <select className="input" value={audience} onChange={(e) => setAudience(e.target.value as Audience)} style={{ width: "100%" }}>
          <option value="subscribers">Newsletter subscribers ({counts.subscribers})</option>
          <option value="customers">Customers who ordered ({counts.customers})</option>
          <option value="manual">Custom list</option>
        </select>

        {audience === "manual" && (
          <>
            <label style={label}>Recipients</label>
            <textarea className="input" value={manual} onChange={(e) => setManual(e.target.value)} rows={3} style={{ width: "100%" }} placeholder="Comma, space, or newline separated email addresses" />
          </>
        )}

        <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap", marginTop: 18, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <label style={label}>Send a test to</label>
            <input className="input" type="email" value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="you@example.com" style={{ width: "100%" }} />
          </div>
          <button type="button" className="admin-btn admin-btn-ghost" onClick={onSendTest} disabled={disabled || !testTo}>
            {busy === "test" ? "Sending…" : "Send test"}
          </button>
          <button type="button" className="admin-btn admin-btn-primary" onClick={onSendAll} disabled={disabled}>
            {busy === "send"
              ? "Sending…"
              : audience === "manual"
                ? "Send to list"
                : `Send to ${audienceCount ?? 0} ${audience}`}
          </button>
        </div>
      </section>
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 10 }}>
      <span style={{ color: "var(--text-muted)", minWidth: 90 }}>{label}:</span>
      <span style={{ color: "var(--text)" }}>{children}</span>
    </div>
  );
}

const cardTitle: React.CSSProperties = {
  fontFamily: "var(--font-heading)",
  fontSize: "1.05rem",
  color: "var(--text)",
  margin: "0 0 12px",
};
const label: React.CSSProperties = {
  display: "block",
  margin: "14px 0 6px",
  fontSize: 12,
  color: "var(--text-muted)",
  textTransform: "uppercase",
  letterSpacing: 0.4,
};
const toastStyle: React.CSSProperties = {
  position: "fixed",
  top: 80,
  right: 24,
  background: "#10b981",
  color: "#fff",
  padding: "10px 16px",
  borderRadius: 8,
  fontSize: 14,
  zIndex: 1100,
  maxWidth: 360,
};
const errorStyle: React.CSSProperties = {
  background: "rgba(220, 38, 38, 0.12)",
  border: "1px solid rgba(220, 38, 38, 0.4)",
  color: "#fca5a5",
  padding: "10px 14px",
  borderRadius: 8,
  marginBottom: 14,
  fontSize: 13,
};
