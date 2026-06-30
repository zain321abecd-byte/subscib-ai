"use client";

import { useState } from "react";
import { sendPromotion, sendTestEmail, type Audience } from "./actions";

type Status = {
  provider: string;
  configured: boolean;
  from: string;
  replyTo: string;
  reachable: boolean;
  error?: string;
};

type EmailType = { id: string; label: string; icon: string; subject: string; html: string };

const EMAIL_TYPES: EmailType[] = [
  {
    id: "promotion",
    label: "Promotion / Offer",
    icon: "fa-tags",
    subject: "A special offer from SubscribAI",
    html: "<p>Hi there,</p>\n<p>For a limited time, enjoy an exclusive offer on SubscribAI premium subscriptions.</p>\n<p><a href=\"https://subscribai.com\">Shop now →</a></p>",
  },
  {
    id: "update",
    label: "Product update",
    icon: "fa-bullhorn",
    subject: "What's new at SubscribAI",
    html: "<p>Hi there,</p>\n<p>Here's the latest update from SubscribAI.</p>",
  },
  {
    id: "announcement",
    label: "Announcement",
    icon: "fa-circle-info",
    subject: "An announcement from SubscribAI",
    html: "<p>Hi there,</p>\n<p>We have an important announcement to share with you.</p>",
  },
  {
    id: "newsletter",
    label: "Newsletter",
    icon: "fa-newspaper",
    subject: "SubscribAI Newsletter",
    html: "<p>Hi there,</p>\n<p>Welcome to this edition of the SubscribAI newsletter.</p>",
  },
  {
    id: "custom",
    label: "Custom (blank)",
    icon: "fa-pen",
    subject: "",
    html: "",
  },
];

export default function EmailClient({
  status,
  counts,
  canSend,
}: {
  status: Status;
  counts: { subscribers: number; customers: number };
  canSend: boolean;
}) {
  const [type, setType] = useState<string>(EMAIL_TYPES[0].id);
  const [subject, setSubject] = useState(EMAIL_TYPES[0].subject);
  const [html, setHtml] = useState(EMAIL_TYPES[0].html);
  const [text, setText] = useState("");
  const [audience, setAudience] = useState<Audience>("subscribers");
  const [manual, setManual] = useState("");
  const [testTo, setTestTo] = useState("");
  const [busy, setBusy] = useState<"" | "test" | "send">("");
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const typeLabel = EMAIL_TYPES.find((t) => t.id === type)?.label ?? "email";

  function applyType(id: string) {
    setType(id);
    const t = EMAIL_TYPES.find((x) => x.id === id);
    // Switching to a preset loads its starter template; "custom" leaves your
    // current text untouched so you can edit freely.
    if (t && id !== "custom") {
      setSubject(t.subject);
      setHtml(t.html);
      setText("");
    }
  }

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

  function onSendAll() {
    setError(null);
    if (!html.trim()) {
      setError("Email body can't be empty.");
      return;
    }
    setConfirmOpen(true);
  }

  async function doSendAll() {
    setBusy("send");
    try {
      const res = await sendPromotion({ audience, manual, subject, html, text: text || undefined });
      if (!res.ok) throw new Error(res.error);
      setConfirmOpen(false);
      flash(`Sent to ${res.sent ?? 0} of ${res.total ?? 0} recipients.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send.");
      setConfirmOpen(false);
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
              {status.configured ? "Configured" : status.reachable ? "Not configured" : "Backend unreachable"}
            </span>
          </Row>
          <Row label="Provider">{status.provider}</Row>
          <Row label="From">{status.from || "—"}</Row>
          <Row label="Reply-to">{status.replyTo || "—"}</Row>
        </div>
        {!status.reachable && (
          <p style={{ marginTop: 10, fontSize: 13, color: "var(--text-muted)" }}>
            The web app couldn&apos;t reach the email backend{status.error ? <> (<code>{status.error}</code>)</> : null}.
            Set the <strong>same</strong> <code>INTERNAL_API_TOKEN</code> in both the API (<code>api/.env</code>) and the
            web app (<code>.env.local</code> / Vercel), confirm <code>NEXT_PUBLIC_API_URL</code> points at the API, then
            restart both.
          </p>
        )}
        {status.reachable && !status.configured && (
          <p style={{ marginTop: 10, fontSize: 13, color: "var(--text-muted)" }}>
            The backend is reachable but SMTP isn&apos;t set there. Set <code>SMTP_HOST</code>, <code>SMTP_USER</code>,{" "}
            <code>SMTP_PASS</code> and <code>EMAIL_FROM</code> in the API environment.
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

        <label style={label}>Email type</label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {EMAIL_TYPES.map((t) => {
            const active = t.id === type;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => applyType(t.id)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 14px",
                  borderRadius: 999,
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                  border: active ? "1.5px solid var(--brand-500)" : "1px solid var(--border)",
                  background: active ? "var(--brand-soft)" : "transparent",
                  color: active ? "var(--brand-300)" : "var(--text-soft)",
                }}
              >
                <i className={`fa-solid ${t.icon}`} />
                {t.label}
              </button>
            );
          })}
        </div>

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

      {/* Send confirmation modal */}
      {confirmOpen && (
        <div style={confirmOverlay} onClick={() => (busy === "send" ? null : setConfirmOpen(false))}>
          <div style={confirmCard} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
              <span style={confirmIcon}><i className="fa-solid fa-paper-plane" /></span>
              <h3 style={{ margin: 0, fontSize: 18, color: "var(--text)" }}>Send {typeLabel.toLowerCase()}?</h3>
            </div>
            <p style={{ margin: "8px 0 0", color: "var(--text-soft)", fontSize: 14, lineHeight: 1.5 }}>
              You&apos;re about to send{" "}
              <strong style={{ color: "var(--text)" }}>“{subject || "(no subject)"}”</strong> to{" "}
              <strong style={{ color: "var(--text)" }}>
                {audience === "manual"
                  ? "your custom list"
                  : `all ${audienceCount ?? 0} ${audience}`}
              </strong>
              . This can&apos;t be undone.
            </p>
            <p style={{ margin: "6px 0 0", color: "var(--text-muted)", fontSize: 12.5 }}>
              Tip: send yourself a test first to preview how it looks.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
              <button type="button" className="admin-btn admin-btn-ghost" onClick={() => setConfirmOpen(false)} disabled={busy === "send"}>
                Cancel
              </button>
              <button type="button" className="admin-btn admin-btn-primary" onClick={doSendAll} disabled={busy === "send"}>
                {busy === "send" ? "Sending…" : "Yes, send it"}
              </button>
            </div>
          </div>
        </div>
      )}
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
const confirmOverlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(17, 19, 24, 0.6)",
  backdropFilter: "blur(2px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1200,
  padding: 16,
};
const confirmCard: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 16,
  padding: 22,
  width: "100%",
  maxWidth: 460,
  boxShadow: "0 30px 70px rgba(0,0,0,0.45)",
};
const confirmIcon: React.CSSProperties = {
  width: 38,
  height: 38,
  flexShrink: 0,
  borderRadius: 10,
  display: "grid",
  placeItems: "center",
  background: "var(--brand-soft)",
  color: "var(--brand-500)",
  fontSize: 15,
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
