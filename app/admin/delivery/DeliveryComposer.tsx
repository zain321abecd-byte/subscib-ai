"use client";

/**
 * Subscription Delivery Automation — compose screen.
 *
 * Pick a template, pick the subscription, paste the credentials, preview,
 * send. The preview on the right renders locally (same substitution code the
 * backend uses) so it updates as you type; pressing "Preview message" asks the
 * server for the authoritative render before anything goes out.
 *
 * When no WhatsApp API is configured the send still happens: the message is
 * logged as `pending` and the admin gets a one-click wa.me link — which is
 * already far quicker than typing each delivery by hand.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  KIND_LABELS,
  LANGUAGES,
  addDaysIso,
  formatDate,
  formatPhone,
  languageLabel,
  maskPasswordInText,
  normalizePhone,
  renderTemplate,
  todayIso,
  type DeliveryVariables,
  type MessageTemplateRow,
} from "@/lib/delivery";
import {
  previewDeliveryMessage,
  sendDeliveryMessage,
  type DeliveryStatus,
  type OrderPrefill,
  type SendResult,
} from "./actions";
import {
  ConfirmModal,
  CopyButton,
  Field,
  FieldRow,
  ModalShell,
  Pill,
  StyledSelect,
  flashStyle,
  footerCancelStyle,
  footerPrimaryStyle,
} from "./ui";

type Product = { id: string; name: string };

const OTHER_PRODUCT = "__other__";

export default function DeliveryComposer({
  templates,
  products,
  status,
  brand,
  canSend,
  canManageTemplates,
  prefill,
}: {
  templates: MessageTemplateRow[];
  products: Product[];
  status: DeliveryStatus;
  brand: { supportEmail: string; supportWhatsapp: string; brandName: string };
  canSend: boolean;
  canManageTemplates: boolean;
  prefill: OrderPrefill | null;
}) {
  const router = useRouter();

  // ── form state ──────────────────────────────────────────────────────────
  const [language, setLanguage] = useState("en");
  const [manualTemplateId, setManualTemplateId] = useState<string>("");

  const [productId, setProductId] = useState<string>(prefill?.productId ?? "");
  const [productNameOther, setProductNameOther] = useState<string>(
    prefill?.productId ? "" : prefill?.productName ?? "",
  );

  const [customerName, setCustomerName] = useState(prefill?.customerName ?? "");
  const [phone, setPhone] = useState(prefill?.customerPhone ?? "");
  const [customerEmail, setCustomerEmail] = useState(prefill?.customerEmail ?? "");

  const [loginEmail, setLoginEmail] = useState("");
  const [password, setPassword] = useState("");
  const [revealPassword, setRevealPassword] = useState(false);
  const [accountDetails, setAccountDetails] = useState("");
  const [planName, setPlanName] = useState(prefill?.planName ?? "");
  const [startDate, setStartDate] = useState(todayIso());
  const [renewalDate, setRenewalDate] = useState(addDaysIso(todayIso(), 30));
  const [expiryDate, setExpiryDate] = useState(addDaysIso(todayIso(), 30));
  const [notes, setNotes] = useState("");
  const [alsoEmail, setAlsoEmail] = useState(false);

  const [editBody, setEditBody] = useState(false);
  const [bodyDraft, setBodyDraft] = useState("");

  // ── ui state ────────────────────────────────────────────────────────────
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<{ kind: "ok" | "err" | "warn"; msg: string } | null>(null);
  const [serverPreview, setServerPreview] = useState<{ body: string; missing: string[]; unknown: string[] } | null>(null);
  const [duplicate, setDuplicate] = useState<{ message: string } | null>(null);
  const [result, setResult] = useState<SendResult | null>(null);

  function notify(kind: "ok" | "err" | "warn", msg: string) {
    setFlash({ kind, msg });
    if (kind === "ok") setTimeout(() => setFlash(null), 6000);
  }

  // ── derived ─────────────────────────────────────────────────────────────
  const deliveryTemplates = useMemo(
    () => templates.filter((t) => t.kind === "delivery" && t.active),
    [templates],
  );

  const resolvedProductName = productId && productId !== OTHER_PRODUCT
    ? products.find((p) => p.id === productId)?.name ?? productNameOther
    : productNameOther;

  const effectiveProductId = productId && productId !== OTHER_PRODUCT ? productId : null;

  /**
   * Same ranking the backend uses: a template scoped to this product wins,
   * then the requested language, then the flagged default. An explicit pick
   * in the dropdown always wins over the automatic choice.
   */
  const autoTemplate = useMemo(() => {
    const score = (t: MessageTemplateRow) => {
      let s = 0;
      if (effectiveProductId && t.product_id === effectiveProductId) s += 8;
      else if (t.product_id) s -= 8;
      if (t.language === language) s += 4;
      else if (t.language === "en") s += 1;
      if (t.is_default) s += 2;
      return s;
    };
    const usable = deliveryTemplates.filter(
      (t) => !t.product_id || !effectiveProductId || t.product_id === effectiveProductId,
    );
    return usable.sort((a, b) => score(b) - score(a))[0] ?? null;
  }, [deliveryTemplates, effectiveProductId, language]);

  const template = manualTemplateId
    ? deliveryTemplates.find((t) => t.id === manualTemplateId) ?? autoTemplate
    : autoTemplate;

  const variables: DeliveryVariables = {
    customer_name: customerName,
    subscription_name: resolvedProductName,
    plan_name: planName,
    email: loginEmail,
    password,
    account_details: accountDetails,
    start_date: startDate,
    renewal_date: renewalDate,
    expiry_date: expiryDate,
    notes,
    order_number: prefill?.orderNumber ?? "",
    support_email: brand.supportEmail,
    support_whatsapp: brand.supportWhatsapp,
    brand_name: brand.brandName,
  };

  const sourceBody = editBody ? bodyDraft : template?.body ?? "";
  const live = useMemo(
    () => renderTemplate(sourceBody, {
      ...variables,
      start_date: formatDate(variables.start_date),
      renewal_date: formatDate(variables.renewal_date),
      expiry_date: formatDate(variables.expiry_date),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sourceBody, JSON.stringify(variables)],
  );

  const normalizedPhone = normalizePhone(phone);
  const phoneProblem = phone.trim() && !normalizedPhone
    ? "That number doesn't look valid — use 03001234567 or +923001234567."
    : null;

  const missingRequired: string[] = [];
  if (!template && !editBody) missingRequired.push("a message template");
  if (!resolvedProductName.trim()) missingRequired.push("the subscription");
  if (!normalizedPhone) missingRequired.push("a valid WhatsApp number");
  const readyToSend = canSend && missingRequired.length === 0 && live.text.trim().length > 0;

  // ── actions ─────────────────────────────────────────────────────────────
  function payload(force = false) {
    return {
      templateId: editBody ? null : template?.id ?? null,
      bodyOverride: editBody ? bodyDraft : null,
      kind: "delivery" as const,
      language: template?.language ?? language,
      productId: effectiveProductId,
      productName: resolvedProductName,
      customerPhone: phone,
      customerName: customerName || null,
      customerEmail: customerEmail || null,
      alsoEmail,
      variables,
      orderId: prefill?.orderId ?? null,
      force,
    };
  }

  async function openPreview() {
    setBusy(true);
    setFlash(null);
    const res = await previewDeliveryMessage({
      templateId: editBody ? null : template?.id ?? null,
      bodyOverride: editBody ? bodyDraft : null,
      kind: "delivery",
      language: template?.language ?? language,
      productId: effectiveProductId,
      productName: resolvedProductName,
      variables,
      customerPhone: phone,
    });
    setBusy(false);
    if (!res.ok) { notify("err", res.error); return; }
    setServerPreview({ body: res.data!.body, missing: res.data!.missing, unknown: res.data!.unknown });
  }

  async function doSend(force = false) {
    setBusy(true);
    setFlash(null);
    setResult(null);
    const res = await sendDeliveryMessage(payload(force));
    setBusy(false);

    if (!res.ok) { notify("err", res.error); return; }
    const data = res.data!;

    if (data.duplicate) {
      setDuplicate({ message: data.message || "This message was already sent recently." });
      return;
    }

    setResult(data);
    if (data.status === "sent") {
      notify("ok", `Message sent to ${formatPhone(normalizedPhone)}${data.emailLog ? " (and emailed)" : ""}.`);
    } else if (data.channel === "manual") {
      notify("warn", "Message prepared and logged. Open WhatsApp below to fire it off.");
    } else {
      notify("err", data.error || "WhatsApp did not accept the message. The wa.me fallback is below.");
    }
    router.refresh();
  }

  function resetForNext() {
    setLoginEmail("");
    setPassword("");
    setAccountDetails("");
    setNotes("");
    setResult(null);
    setServerPreview(null);
    setFlash(null);
  }

  // ── render ──────────────────────────────────────────────────────────────
  return (
    <div>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18, gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "1.65rem", margin: "0 0 4px" }}>
            Subscription Delivery Automation
          </h1>
          <p style={{ color: "var(--text-muted)", margin: 0, fontSize: "0.92rem" }}>
            Send a customer their subscription details on WhatsApp — pick a template, paste the credentials, preview, send.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href="/admin/delivery/history" className="admin-btn admin-btn-ghost">
            <i className="fa-solid fa-clock-rotate-left" style={{ marginRight: 6 }} /> History
          </Link>
          {canManageTemplates && (
            <Link href="/admin/delivery/templates" className="admin-btn admin-btn-ghost">
              <i className="fa-solid fa-file-lines" style={{ marginRight: 6 }} /> Templates
            </Link>
          )}
        </div>
      </header>

      <ProviderBanner status={status} />

      {prefill && (
        <div style={{ ...flashStyle("ok"), marginBottom: 14, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <i className="fa-solid fa-receipt" />
          <span>
            Pre-filled from order{" "}
            <Link href={`/admin/orders/${prefill.orderId}`} style={{ color: "inherit", textDecoration: "underline" }}>
              {prefill.orderNumber}
            </Link>{" "}
            ({prefill.status}).
          </span>
        </div>
      )}

      {flash && <div style={{ ...flashStyle(flash.kind), marginBottom: 14 }}>{flash.msg}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.15fr) minmax(0, 1fr)", gap: 16, alignItems: "start" }} className="admin-delivery-grid">
        {/* ── form ─────────────────────────────────────────────────── */}
        <div style={{ display: "grid", gap: 14 }}>
          <Card title="Message">
            <FieldRow>
              <Field label="Language">
                <StyledSelect
                  value={language}
                  onChange={(v) => { setLanguage(v); setManualTemplateId(""); }}
                  placeholder="Language"
                  icon="fa-language"
                  options={LANGUAGES.map((l) => ({ value: l.value, label: l.label }))}
                />
              </Field>
              <Field
                label="Template"
                hint={
                  template
                    ? `${KIND_LABELS[template.kind]} · ${languageLabel(template.language)}${template.product_id ? " · product-specific" : ""}`
                    : "No delivery template found — create one under Templates."
                }
              >
                <StyledSelect
                  value={manualTemplateId || template?.id || ""}
                  onChange={(v) => setManualTemplateId(v)}
                  placeholder="Select a template"
                  icon="fa-file-lines"
                  disabled={editBody}
                  options={deliveryTemplates.map((t) => ({
                    value: t.id,
                    label: t.name,
                    hint: [
                      languageLabel(t.language),
                      t.product_id ? products.find((p) => p.id === t.product_id)?.name || t.product_id : "any product",
                      t.is_default ? "default" : null,
                    ].filter(Boolean).join(" · "),
                  }))}
                />
              </Field>
            </FieldRow>

            <div style={{ marginTop: 12 }}>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: "0.85rem", color: "var(--text-muted)", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={editBody}
                  onChange={(e) => {
                    setEditBody(e.target.checked);
                    if (e.target.checked) setBodyDraft(template?.body ?? "");
                  }}
                />
                Edit the wording for this message only
              </label>
              {editBody && (
                <textarea
                  className="admin-input admin-textarea"
                  rows={10}
                  value={bodyDraft}
                  onChange={(e) => setBodyDraft(e.target.value)}
                  style={{ marginTop: 8, fontFamily: "var(--font-mono, monospace)", fontSize: "0.82rem" }}
                />
              )}
            </div>
          </Card>

          <Card title="Subscription">
            <FieldRow>
              <Field label="Subscription / product">
                <StyledSelect
                  value={productId}
                  onChange={(v) => { setProductId(v); setManualTemplateId(""); }}
                  placeholder="Select a product"
                  icon="fa-box"
                  options={[
                    ...products.map((p) => ({ value: p.id, label: p.name })),
                    { value: OTHER_PRODUCT, label: "Other (type the name)" },
                  ]}
                />
              </Field>
              <Field label="Plan" hint="Shown as {{plan_name}} — e.g. 1 Month · Private">
                <input className="admin-input" value={planName} onChange={(e) => setPlanName(e.target.value)} placeholder="1 Month · Private" />
              </Field>
            </FieldRow>

            {(productId === OTHER_PRODUCT || (!productId && productNameOther)) && (
              <div style={{ marginTop: 12 }}>
                <Field label="Subscription name">
                  <input
                    className="admin-input"
                    value={productNameOther}
                    onChange={(e) => setProductNameOther(e.target.value)}
                    placeholder="e.g. Perplexity Pro"
                  />
                </Field>
              </div>
            )}

            {prefill && prefill.items.length > 1 && (
              <p className="admin-help" style={{ marginTop: 10 }}>
                This order has {prefill.items.length} items — pick the one you&apos;re delivering, then send again for the next.
              </p>
            )}
          </Card>

          <Card title="Customer">
            <FieldRow>
              <Field label="WhatsApp number" hint={normalizedPhone ? `Will send to ${formatPhone(normalizedPhone)}` : "Pakistani numbers can be typed as 03001234567"}>
                <input
                  className="admin-input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="03001234567"
                  inputMode="tel"
                  style={phoneProblem ? { borderColor: "rgba(245,72,72,0.5)" } : undefined}
                />
              </Field>
              <Field label="Customer name (optional)">
                <input className="admin-input" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Ahmed Raza" />
              </Field>
            </FieldRow>
            {phoneProblem && <p style={{ color: "#F54848", fontSize: "0.8rem", margin: "8px 0 0" }}>{phoneProblem}</p>}

            <div style={{ marginTop: 12 }}>
              <Field label="Customer email (optional)">
                <input className="admin-input" type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="customer@example.com" />
              </Field>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: "0.85rem", color: "var(--text-muted)", cursor: "pointer", marginTop: 10 }}>
                <input
                  type="checkbox"
                  checked={alsoEmail}
                  onChange={(e) => setAlsoEmail(e.target.checked)}
                  disabled={!status.email.configured}
                />
                Also email the same details
                {!status.email.configured && <span style={{ fontSize: "0.75rem" }}>(SMTP not configured)</span>}
              </label>
            </div>
          </Card>

          <Card
            title="Credentials"
            aside={<Pill tone="neutral"><i className="fa-solid fa-lock" style={{ marginRight: 4 }} />Admin only</Pill>}
          >
            <FieldRow>
              <Field label="Login email">
                <input className="admin-input" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} placeholder="account@example.com" autoComplete="off" />
              </Field>
              <Field label="Password">
                <div style={{ position: "relative" }}>
                  <input
                    className="admin-input"
                    type={revealPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    spellCheck={false}
                    style={{ paddingRight: 38 }}
                  />
                  <button
                    type="button"
                    onClick={() => setRevealPassword((v) => !v)}
                    aria-label={revealPassword ? "Hide password" : "Show password"}
                    style={{
                      position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                      background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 13,
                    }}
                  >
                    <i className={`fa-solid ${revealPassword ? "fa-eye-slash" : "fa-eye"}`} />
                  </button>
                </div>
              </Field>
            </FieldRow>

            <div style={{ marginTop: 12 }}>
              <Field label="Account details (optional)" hint="Profile, PIN, device limit — anything else the customer needs.">
                <textarea className="admin-input admin-textarea" rows={2} value={accountDetails} onChange={(e) => setAccountDetails(e.target.value)} />
              </Field>
            </div>

            <div style={{ marginTop: 12 }}>
              <FieldRow min={150}>
                <Field label="Activation date">
                  <input className="admin-input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </Field>
                <Field label="Renewal date">
                  <input className="admin-input" type="date" value={renewalDate} onChange={(e) => setRenewalDate(e.target.value)} />
                </Field>
                <Field label="Expiry date">
                  <input className="admin-input" type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
                </Field>
              </FieldRow>
            </div>

            <div style={{ marginTop: 12 }}>
              <Field label="Additional notes (optional)">
                <textarea className="admin-input admin-textarea" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything extra to include in the message." />
              </Field>
            </div>
          </Card>
        </div>

        {/* ── preview ──────────────────────────────────────────────── */}
        <div style={{ display: "grid", gap: 14, position: "sticky", top: 16 }}>
          <Card
            title="Preview"
            aside={
              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                {live.text.length} chars
              </span>
            }
          >
            <WhatsAppBubble text={revealPassword ? live.text : maskPasswordInText(live.text, password)} />

            {!revealPassword && password && (
              <p className="admin-help" style={{ marginTop: 8 }}>
                Password masked in this preview — the customer receives the real one.
              </p>
            )}

            {live.missing.length > 0 && (
              <div style={{ ...flashStyle("warn"), marginTop: 12, fontSize: "0.82rem" }}>
                Still empty: {live.missing.map((k) => `{{${k}}}`).join(", ")} — those lines will be dropped from the message.
              </div>
            )}
            {live.unknown.length > 0 && (
              <div style={{ ...flashStyle("err"), marginTop: 12, fontSize: "0.82rem" }}>
                Unknown variables in the template: {live.unknown.map((k) => `{{${k}}}`).join(", ")}. They will be removed before sending.
              </div>
            )}

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
              <button type="button" className="admin-btn admin-btn-ghost" onClick={openPreview} disabled={busy || !live.text.trim()}>
                <i className="fa-solid fa-eye" style={{ marginRight: 6 }} /> Preview message
              </button>
              <CopyButton text={live.text} />
              <button
                type="button"
                className="admin-btn admin-btn-primary"
                onClick={() => doSend(false)}
                disabled={busy || !readyToSend}
                title={readyToSend ? undefined : missingRequired.length ? `Add ${missingRequired.join(", ")}` : "You don't have permission to send"}
              >
                <i className="fa-brands fa-whatsapp" style={{ marginRight: 6 }} />
                {busy ? "Sending…" : "Send message"}
              </button>
            </div>

            {!canSend && (
              <p className="admin-help" style={{ marginTop: 10 }}>
                You can preview and copy, but sending needs the <code>delivery:send</code> permission.
              </p>
            )}
            {canSend && missingRequired.length > 0 && (
              <p className="admin-help" style={{ marginTop: 10 }}>Add {missingRequired.join(", ")} to enable sending.</p>
            )}
          </Card>

          {result && <SendOutcome result={result} onReset={resetForNext} />}
        </div>
      </div>

      {serverPreview && (
        <ModalShell
          title="Message preview"
          size="md"
          onClose={() => setServerPreview(null)}
          footer={
            <>
              <button type="button" style={footerCancelStyle} onClick={() => setServerPreview(null)}>CLOSE</button>
              <button
                type="button"
                style={footerPrimaryStyle(readyToSend && !busy)}
                disabled={!readyToSend || busy}
                onClick={async () => { setServerPreview(null); await doSend(false); }}
              >
                SEND MESSAGE
              </button>
            </>
          }
        >
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: 0 }}>
            Exactly what {normalizedPhone ? formatPhone(normalizedPhone) : "the customer"} will receive.
          </p>
          <WhatsAppBubble text={serverPreview.body} />
          {serverPreview.missing.length > 0 && (
            <div style={{ ...flashStyle("warn"), marginTop: 12, fontSize: "0.82rem" }}>
              Empty variables were dropped: {serverPreview.missing.join(", ")}.
            </div>
          )}
        </ModalShell>
      )}

      {duplicate && (
        <ConfirmModal
          title="Send this again?"
          danger={false}
          confirmLabel="Send anyway"
          message={<>{duplicate.message}</>}
          onCancel={() => setDuplicate(null)}
          onConfirm={async () => { setDuplicate(null); await doSend(true); }}
        />
      )}
    </div>
  );
}

// ── pieces ────────────────────────────────────────────────────────────────

function Card({ title, aside, children }: { title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px 18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, gap: 10 }}>
        <h2 style={{ margin: 0, fontFamily: "var(--font-heading)", fontSize: "0.75rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: 700 }}>
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

/** WhatsApp-ish chat bubble so the admin sees the real shape of the message. */
function WhatsAppBubble({ text }: { text: string }) {
  return (
    <div style={{ background: "rgba(11,20,26,0.6)", border: "1px solid var(--border)", borderRadius: 10, padding: 12 }}>
      <div
        style={{
          background: "#075E54", color: "#fff", borderRadius: "10px 10px 10px 2px",
          padding: "10px 12px", fontSize: "0.86rem", lineHeight: 1.55,
          whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: 420, overflowY: "auto",
        }}
        className="admin-scroll"
      >
        {text || "Your message preview will appear here as you fill the form."}
      </div>
    </div>
  );
}

function ProviderBanner({ status }: { status: DeliveryStatus }) {
  if (!status.reachable) {
    return (
      <div style={{ ...flashStyle("err"), marginBottom: 14 }}>
        <strong>Backend unreachable.</strong> {status.error} Templates and history still load from the database, but
        nothing can be sent until the API is back.
      </div>
    );
  }
  if (status.whatsapp.configured) {
    return (
      <div style={{ ...flashStyle("ok"), marginBottom: 14, fontSize: "0.85rem" }}>
        <i className="fa-brands fa-whatsapp" style={{ marginRight: 6 }} />
        WhatsApp {status.whatsapp.provider === "cloud" ? "Cloud API" : "gateway"} connected
        {status.whatsapp.from ? ` · sending from ${status.whatsapp.from}` : ""} · duplicate guard {status.duplicateWindowMinutes} min
      </div>
    );
  }
  return (
    <div style={{ ...flashStyle("warn"), marginBottom: 14, fontSize: "0.85rem" }}>
      <strong>Manual mode.</strong> No WhatsApp API is configured, so each message is rendered and logged, then opens
      in WhatsApp Web with one click. Set <code>WHATSAPP_PHONE_NUMBER_ID</code> + <code>WHATSAPP_ACCESS_TOKEN</code>{" "}
      (or <code>WHATSAPP_CUSTOM_URL</code>) on the API to send automatically.
    </div>
  );
}

function SendOutcome({ result, onReset }: { result: SendResult; onReset: () => void }) {
  const sent = result.status === "sent";
  const tone = sent ? "ok" : result.status === "failed" ? "err" : "warn";
  return (
    <section style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px 18px" }}>
      <div style={{ ...flashStyle(tone), marginBottom: 12 }}>
        {sent && <><i className="fa-solid fa-circle-check" style={{ marginRight: 6 }} />Delivered to WhatsApp{result.provider ? ` via ${result.provider}` : ""}.</>}
        {!sent && result.channel === "manual" && <><i className="fa-solid fa-hand-pointer" style={{ marginRight: 6 }} />Logged as pending — open WhatsApp to send it.</>}
        {!sent && result.channel !== "manual" && <><i className="fa-solid fa-circle-exclamation" style={{ marginRight: 6 }} />{result.error || "Send failed."}</>}
      </div>

      {result.needsApprovedTemplate && (
        <div style={{ ...flashStyle("warn"), marginBottom: 12, fontSize: "0.85rem" }}>
          <strong>WhatsApp needs an approved template for this one.</strong> Meta only allows
          free-form messages within 24 hours of the customer messaging you. Add your approved
          template name to this message template under{" "}
          <Link href="/admin/delivery/templates" style={{ color: "inherit", textDecoration: "underline" }}>
            Templates
          </Link>
          , then resend. The message is logged and the WhatsApp link below still works meanwhile.
        </div>
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {result.manualLink && (
          <a
            className="admin-btn admin-btn-primary"
            href={result.manualLink}
            target="_blank"
            rel="noopener noreferrer"
            style={{ background: "#22c55e", borderColor: "#22c55e" }}
          >
            <i className="fa-brands fa-whatsapp" style={{ marginRight: 6 }} /> Open in WhatsApp
          </a>
        )}
        {result.body && <CopyButton text={result.body} label="Copy sent message" />}
        <button type="button" className="admin-btn admin-btn-ghost" onClick={onReset}>
          <i className="fa-solid fa-rotate-left" style={{ marginRight: 6 }} /> Clear credentials
        </button>
        <Link href="/admin/delivery/history" className="admin-btn admin-btn-ghost">
          <i className="fa-solid fa-clock-rotate-left" style={{ marginRight: 6 }} /> View in history
        </Link>
      </div>

      {result.emailLog && (
        <p className="admin-help" style={{ marginTop: 10 }}>
          Email copy: {result.emailLog.status === "sent" ? "sent" : `failed — ${result.emailLog.error}`}.
        </p>
      )}
    </section>
  );
}
