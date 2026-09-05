"use client";

/**
 * Send by WhatsApp — the counter screen.
 *
 * Pick a template, fill the fields it asks for, check the preview, press one
 * button. That opens wa.me in a new tab with the message already typed; the
 * staff member presses send inside WhatsApp. Nothing is sent from here and
 * nothing reaches Meta — no tokens, no API, no logging.
 *
 * The inputs under the template are generated from whatever `{tokens}` its
 * body contains, so adding a template to lib/whatsapp-templates.ts needs no
 * change on this screen.
 */

import { useId, useMemo, useState } from "react";
import {
  COUNTRY_CODES,
  DEFAULT_COUNTRY_ISO,
  WHATSAPP_TEMPLATES,
  buildWaNumber,
  extractPlaceholders,
  fillTemplate,
  humanizePlaceholder,
  splitInternational,
  valuesFromCustomer,
  waHref,
  type PickableCustomer,
} from "@/lib/whatsapp-templates";
import { Field, FieldRow, StyledSelect, flashStyle } from "../delivery/ui";

const NO_CUSTOMER = "__manual__";

export default function WhatsAppSendClient({ customers }: { customers: PickableCustomer[] }) {
  const [templateId, setTemplateId] = useState(WHATSAPP_TEMPLATES[0]?.id ?? "");
  const [values, setValues] = useState<Record<string, string>>({});
  const [useOverride, setUseOverride] = useState(false);
  const [override, setOverride] = useState("");
  const [countryIso, setCountryIso] = useState(DEFAULT_COUNTRY_ISO);
  const [national, setNational] = useState("");
  const [customerId, setCustomerId] = useState(NO_CUSTOMER);
  const [status, setStatus] = useState<{ kind: "ok" | "err" | "warn"; msg: string } | null>(null);

  const reasonId = useId();
  const statusId = useId();

  const template = WHATSAPP_TEMPLATES.find((t) => t.id === templateId) ?? WHATSAPP_TEMPLATES[0];
  const placeholders = useMemo(() => extractPlaceholders(template?.body ?? ""), [template?.body]);

  const country = COUNTRY_CODES.find((c) => c.iso === countryIso) ?? COUNTRY_CODES[0];
  const phone = buildWaNumber(country?.dial ?? "", national);

  const message = useOverride ? override : fillTemplate(template?.body ?? "", values);
  const hasMessage = message.trim().length > 0;
  const canSend = hasMessage && !phone.error;

  // Why the button is unavailable, said plainly. Referenced by the button via
  // aria-describedby so a screen reader announces it along with the label.
  const blockedReason = !hasMessage && phone.error
    ? "Add a message and a valid number to continue."
    : !hasMessage
      ? "Write a message to continue."
      : phone.error ?? "";

  function setValue(token: string, value: string) {
    setValues((prev) => ({ ...prev, [token]: value }));
  }

  function pickCustomer(id: string) {
    setCustomerId(id);
    setStatus(null);
    if (id === NO_CUSTOMER) return;

    const customer = customers.find((c) => c.id === id);
    if (!customer) return;

    const split = splitInternational(customer.phone);
    if (split) {
      setCountryIso(split.iso);
      setNational(split.national);
    } else {
      setNational(customer.phone.replace(/\D+/g, ""));
    }
    setValues((prev) => ({ ...prev, ...valuesFromCustomer(placeholders, customer) }));
  }

  function openWhatsApp() {
    if (!canSend) {
      // aria-disabled keeps the button focusable, so a click can still land —
      // answer it with the reason instead of doing nothing.
      setStatus({ kind: "warn", msg: blockedReason });
      return;
    }
    window.open(waHref(phone.digits, message), "_blank", "noopener");
    setStatus({ kind: "ok", msg: "WhatsApp opened in a new tab. Press send there to deliver the message." });
  }

  async function copyMessage() {
    if (!hasMessage) {
      setStatus({ kind: "warn", msg: "Write a message before copying." });
      return;
    }
    try {
      await navigator.clipboard.writeText(message);
      setStatus({ kind: "ok", msg: "Message copied to the clipboard." });
    } catch {
      // Clipboard access needs a secure context and, in some browsers, a
      // permission the user has denied. Say so rather than claiming success.
      setStatus({
        kind: "err",
        msg: "Your browser blocked the clipboard. Select the text in the preview and copy it manually.",
      });
    }
  }

  return (
    <div className="wa-send">
      <header style={{ marginBottom: 18 }}>
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "1.65rem", margin: "0 0 4px" }}>
          Send by WhatsApp
        </h1>
        <p style={{ color: "var(--text-muted)", margin: 0, fontSize: "0.92rem" }}>
          Pick a template, check the preview, and open the chat with the message ready to send.
        </p>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 16,
          alignItems: "start",
        }}
      >
        {/* ── compose ─────────────────────────────────────────────── */}
        <div style={{ display: "grid", gap: 14 }}>
          <Card title="Message">
            <Field label="Template">
              <StyledSelect
                value={templateId}
                onChange={(v) => { setTemplateId(v); setStatus(null); }}
                placeholder="Choose a template"
                icon="fa-file-lines"
                options={WHATSAPP_TEMPLATES.map((t) => ({ value: t.id, label: t.name }))}
              />
            </Field>

            {placeholders.length > 0 && !useOverride && (
              <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
                <FieldRow>
                  {placeholders.map((token) => (
                    <Field key={token} label={humanizePlaceholder(token)}>
                      <input
                        className="admin-input"
                        value={values[token] ?? ""}
                        onChange={(e) => setValue(token, e.target.value)}
                        placeholder={`{${token}}`}
                        autoComplete="off"
                      />
                    </Field>
                  ))}
                </FieldRow>
              </div>
            )}

            <div style={{ marginTop: 12 }}>
              <label
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  fontSize: "0.85rem", color: "var(--text-muted)", cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={useOverride}
                  onChange={(e) => {
                    setUseOverride(e.target.checked);
                    if (e.target.checked && !override) {
                      setOverride(fillTemplate(template?.body ?? "", values));
                    }
                    setStatus(null);
                  }}
                />
                Write the message myself instead
              </label>

              {useOverride && (
                <textarea
                  className="admin-input admin-textarea"
                  rows={8}
                  value={override}
                  onChange={(e) => setOverride(e.target.value)}
                  placeholder="Type the message to send."
                  style={{ marginTop: 8 }}
                  aria-label="Custom message"
                />
              )}
            </div>
          </Card>

          <Card title="Customer">
            {customers.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <Field
                  label="Load a saved customer (optional)"
                  hint="Fills the number and any matching fields. You can still edit everything afterwards."
                >
                  <StyledSelect
                    value={customerId}
                    onChange={pickCustomer}
                    placeholder="Type the number manually"
                    icon="fa-address-book"
                    options={[
                      { value: NO_CUSTOMER, label: "Type the number manually" },
                      ...customers.map((c) => ({ value: c.id, label: c.name, hint: c.hint })),
                    ]}
                  />
                </Field>
              </div>
            )}

            <FieldRow min={150}>
              <Field label="Country code">
                <StyledSelect
                  value={countryIso}
                  onChange={(v) => { setCountryIso(v); setStatus(null); }}
                  placeholder="Country"
                  icon="fa-globe"
                  options={COUNTRY_CODES.map((c) => ({ value: c.iso, label: c.label }))}
                />
              </Field>
              <Field
                label="Phone number"
                hint={
                  phone.digits
                    ? `Will open a chat with +${phone.digits}`
                    : "Local format is fine — a leading zero is removed automatically."
                }
              >
                <input
                  className="admin-input"
                  value={national}
                  onChange={(e) => { setNational(e.target.value); setStatus(null); }}
                  placeholder="300 1234567"
                  inputMode="tel"
                  autoComplete="off"
                  aria-invalid={national.trim().length > 0 && Boolean(phone.error)}
                  aria-describedby={national.trim().length > 0 && phone.error ? reasonId : undefined}
                  style={
                    national.trim().length > 0 && phone.error
                      ? { borderColor: "rgba(245,72,72,0.55)" }
                      : undefined
                  }
                />
              </Field>
            </FieldRow>

            {national.trim().length > 0 && phone.error && (
              <p id={reasonId} style={{ color: "#F54848", fontSize: "0.82rem", margin: "8px 0 0" }}>
                {phone.error}
              </p>
            )}
          </Card>
        </div>

        {/* ── preview + actions ───────────────────────────────────── */}
        <div style={{ display: "grid", gap: 14 }}>
          <Card
            title="Preview"
            aside={
              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                {message.length} characters
              </span>
            }
          >
            <div
              style={{
                background: "rgba(11,20,26,0.6)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                padding: 12,
              }}
            >
              <div
                className="admin-scroll"
                style={{
                  background: "#075E54",
                  color: "#fff",
                  borderRadius: "10px 10px 10px 2px",
                  padding: "10px 12px",
                  fontSize: "0.86rem",
                  lineHeight: 1.55,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  maxHeight: 380,
                  overflowY: "auto",
                }}
              >
                {hasMessage ? message : "Your message will appear here as you fill the fields."}
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
              <button
                type="button"
                className="admin-btn admin-btn-primary"
                onClick={openWhatsApp}
                aria-disabled={!canSend}
                aria-describedby={canSend ? undefined : `${reasonId}-blocked`}
                style={
                  canSend
                    ? { background: "#22c55e", borderColor: "#22c55e" }
                    : { opacity: 0.55, cursor: "not-allowed" }
                }
              >
                <i className="fa-brands fa-whatsapp" style={{ marginRight: 6 }} aria-hidden="true" />
                Open in WhatsApp
              </button>

              <button type="button" className="admin-btn admin-btn-ghost" onClick={copyMessage}>
                <i className="fa-solid fa-copy" style={{ marginRight: 6 }} aria-hidden="true" />
                Copy text
              </button>
            </div>

            {/* Always in the DOM so assistive tech can reach the reason even
                while the button is aria-disabled. */}
            <p
              id={`${reasonId}-blocked`}
              className="admin-help"
              style={{ marginTop: 10, minHeight: canSend ? 0 : undefined }}
            >
              {canSend
                ? "Opens a new tab. The message is typed for you — press send inside WhatsApp."
                : blockedReason}
            </p>

            <div id={statusId} role="status" aria-live="polite">
              {status && <div style={{ ...flashStyle(status.kind), marginTop: 12 }}>{status.msg}</div>}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

/** Section wrapper, matching the card used across the delivery screens. */
function Card({ title, aside, children }: { title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "16px 18px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, gap: 10 }}>
        <h2
          style={{
            margin: 0,
            fontFamily: "var(--font-heading)",
            fontSize: "0.75rem",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
            fontWeight: 700,
          }}
        >
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}
