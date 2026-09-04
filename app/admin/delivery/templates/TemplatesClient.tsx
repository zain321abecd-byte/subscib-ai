"use client";

/**
 * Template management for delivery automation — create, edit, activate /
 * deactivate, delete. Templates are grouped by kind (delivery / renewal
 * reminder / expiry notice) and can be scoped to one product and one
 * language, which is how "different templates for different products" and
 * "English / Urdu" are expressed.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  KIND_LABELS,
  LANGUAGES,
  MESSAGE_KINDS,
  TEMPLATE_VARIABLES,
  languageLabel,
  renderTemplate,
  type MessageKind,
  type MessageTemplateRow,
} from "@/lib/delivery";
import {
  createTemplate,
  deleteTemplate,
  setTemplateActive,
  updateTemplate,
  type TemplateInput,
} from "../actions";
import {
  ConfirmModal,
  Field,
  FieldRow,
  IconBtn,
  ModalShell,
  Pill,
  StyledSelect,
  Th,
  Td,
  flashStyle,
  footerCancelStyle,
  footerPrimaryStyle,
} from "../ui";

type Product = { id: string; name: string };

const ANY_PRODUCT = "__any__";

/** Sample values so "Preview" in the editor shows a realistic message. */
const SAMPLE = Object.fromEntries(TEMPLATE_VARIABLES.map((v) => [v.key, v.example])) as Record<string, string>;

export default function TemplatesClient({
  initialTemplates,
  products,
  canManage,
}: {
  initialTemplates: MessageTemplateRow[];
  products: Product[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [templates, setTemplates] = useState(initialTemplates);
  const [flash, setFlash] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);
  const [kindFilter, setKindFilter] = useState<MessageKind | "all">("all");
  const [editing, setEditing] = useState<MessageTemplateRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<MessageTemplateRow | null>(null);

  function notify(kind: "ok" | "err", msg: string) {
    setFlash({ kind, msg });
    setTimeout(() => setFlash(null), 4000);
  }

  const productName = (id: string | null) =>
    id ? products.find((p) => p.id === id)?.name || id : "Any product";

  const rows = useMemo(() => {
    const list = kindFilter === "all" ? templates : templates.filter((t) => t.kind === kindFilter);
    return [...list].sort((a, b) => {
      if (a.kind !== b.kind) return MESSAGE_KINDS.indexOf(a.kind) - MESSAGE_KINDS.indexOf(b.kind);
      if (a.is_default !== b.is_default) return a.is_default ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [templates, kindFilter]);

  async function submit(input: TemplateInput, id?: string) {
    const res = id ? await updateTemplate(id, input) : await createTemplate(input);
    if (!res.ok) { notify("err", res.error); return false; }
    const row = res.data as MessageTemplateRow;
    setTemplates((prev) => {
      // A new default demotes its siblings — reflect that locally too.
      const next = id ? prev.map((t) => (t.id === id ? row : t)) : [row, ...prev];
      if (!row.is_default) return next;
      return next.map((t) =>
        t.id !== row.id && t.kind === row.kind && t.language === row.language && t.product_id === row.product_id
          ? { ...t, is_default: false }
          : t,
      );
    });
    notify("ok", id ? "Template updated." : "Template created.");
    router.refresh();
    return true;
  }

  async function toggleActive(row: MessageTemplateRow) {
    const res = await setTemplateActive(row.id, !row.active);
    if (!res.ok) { notify("err", res.error); return; }
    setTemplates((prev) => prev.map((t) => (t.id === row.id ? (res.data as MessageTemplateRow) : t)));
    notify("ok", row.active ? "Template deactivated." : "Template activated.");
    router.refresh();
  }

  async function remove(row: MessageTemplateRow) {
    const res = await deleteTemplate(row.id);
    if (!res.ok) { notify("err", res.error); return; }
    setTemplates((prev) => prev.filter((t) => t.id !== row.id));
    notify("ok", "Template deleted.");
    router.refresh();
  }

  return (
    <div>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18, gap: 16, flexWrap: "wrap" }}>
        <div>
          <p style={{ margin: 0 }}>
            <Link href="/admin/delivery" style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>← Delivery automation</Link>
          </p>
          <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "1.65rem", margin: "0 0 4px" }}>Message templates</h1>
          <p style={{ color: "var(--text-muted)", margin: 0, fontSize: "0.92rem" }}>
            Delivery messages, renewal reminders, and expiry notices — per product, per language.
          </p>
        </div>
        {canManage && (
          <button className="admin-btn admin-btn-primary" onClick={() => setCreating(true)}>
            <i className="fa-solid fa-plus" /> New template
          </button>
        )}
      </header>

      {flash && <div style={{ ...flashStyle(flash.kind), marginBottom: 14 }}>{flash.msg}</div>}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        <div style={{ minWidth: 220, maxWidth: 260 }}>
          <StyledSelect
            value={kindFilter}
            onChange={(v) => setKindFilter(v as MessageKind | "all")}
            placeholder="All template types"
            icon="fa-filter"
            options={[
              { value: "all", label: "All template types" },
              ...MESSAGE_KINDS.map((k) => ({ value: k, label: KIND_LABELS[k] })),
            ]}
          />
        </div>
      </div>

      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        {rows.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-muted)" }}>
            <i className="fa-solid fa-file-lines" style={{ fontSize: 28, marginBottom: 10, display: "block" }} />
            <div style={{ fontWeight: 600, color: "var(--text)" }}>No templates yet</div>
            <div style={{ fontSize: "0.85rem", marginTop: 4 }}>
              Run the <code>21-delivery-automation.sql</code> migration to get the starter set, or create one now.
            </div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
              <thead>
                <tr style={{ background: "var(--surface-2, rgba(255,255,255,0.03))" }}>
                  <Th>Template</Th>
                  <Th>Type</Th>
                  <Th>Language</Th>
                  <Th>Product</Th>
                  <Th>WhatsApp</Th>
                  <Th>Status</Th>
                  <Th style={{ textAlign: "right" }}>Actions</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} style={{ borderTop: "1px solid var(--border)" }}>
                    <Td>
                      <div style={{ fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}>
                        {row.name}
                        {row.is_default && <Pill tone="brand">DEFAULT</Pill>}
                      </div>
                      <div style={{ color: "var(--text-muted)", fontSize: "0.78rem", marginTop: 2, maxWidth: 420, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {row.body.split("\n").find((l) => l.trim()) || ""}
                      </div>
                    </Td>
                    <Td>{KIND_LABELS[row.kind]}</Td>
                    <Td>{languageLabel(row.language)}</Td>
                    <Td>{productName(row.product_id)}</Td>
                    <Td>
                      {row.wa_template_name ? (
                        <>
                          <Pill tone="ok">APPROVED TEMPLATE</Pill>
                          <div style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginTop: 4 }}>
                            <code>{row.wa_template_name}</code> · {row.wa_template_language}
                          </div>
                        </>
                      ) : (
                        <>
                          <Pill tone="neutral">FREE-FORM TEXT</Pill>
                          <div style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginTop: 4 }}>
                            24-hour window only
                          </div>
                        </>
                      )}
                    </Td>
                    <Td>
                      <Pill tone={row.active ? "ok" : "neutral"}>{row.active ? "ACTIVE" : "INACTIVE"}</Pill>
                    </Td>
                    <Td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <div style={{ display: "inline-flex", gap: 6 }}>
                        <IconBtn icon="fa-eye" title="Preview" onClick={() => setEditing(row)} />
                        {canManage && (
                          <IconBtn
                            icon={row.active ? "fa-toggle-on" : "fa-toggle-off"}
                            title={row.active ? "Deactivate" : "Activate"}
                            color={row.active ? "#22c55e" : undefined}
                            onClick={() => toggleActive(row)}
                          />
                        )}
                        {canManage && <IconBtn icon="fa-pen" title="Edit" onClick={() => setEditing(row)} />}
                        {canManage && <IconBtn icon="fa-trash" title="Delete" color="#F54848" onClick={() => setConfirmDelete(row)} />}
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <VariableReference />

      {(creating || editing) && (
        <TemplateEditor
          key={editing?.id ?? "new"}
          initial={editing}
          products={products}
          readOnly={!canManage}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSubmit={async (input) => {
            const ok = await submit(input, editing?.id);
            if (ok) { setCreating(false); setEditing(null); }
          }}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          title={`Delete "${confirmDelete.name}"?`}
          confirmLabel="Delete"
          message={
            <>
              The template is removed for good. Messages already sent with it keep their copy in the delivery history.
            </>
          }
          onCancel={() => setConfirmDelete(null)}
          onConfirm={async () => {
            const row = confirmDelete;
            setConfirmDelete(null);
            await remove(row);
          }}
        />
      )}
    </div>
  );
}

// ── editor ────────────────────────────────────────────────────────────────

function TemplateEditor({
  initial, products, readOnly, onClose, onSubmit,
}: {
  initial: MessageTemplateRow | null;
  products: Product[];
  readOnly: boolean;
  onClose: () => void;
  onSubmit: (input: TemplateInput) => Promise<void>;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [kind, setKind] = useState<MessageKind>(initial?.kind ?? "delivery");
  const [language, setLanguage] = useState(initial?.language ?? "en");
  const [productId, setProductId] = useState(initial?.product_id ?? ANY_PRODUCT);
  const [body, setBody] = useState(initial?.body ?? "");
  const [active, setActive] = useState(initial?.active ?? true);
  const [isDefault, setIsDefault] = useState(initial?.is_default ?? false);
  const [waName, setWaName] = useState(initial?.wa_template_name ?? "");
  const [waLang, setWaLang] = useState(initial?.wa_template_language ?? "en_US");
  const [waParams, setWaParams] = useState<string[]>(initial?.wa_body_params ?? []);
  const [busy, setBusy] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const preview = useMemo(() => renderTemplate(body, SAMPLE), [body]);
  const valid = name.trim().length > 0 && body.trim().length > 0;

  function insert(key: string) {
    setBody((b) => `${b}${b && !b.endsWith("\n") ? " " : ""}{{${key}}}`);
  }

  return (
    <ModalShell
      title={initial ? `Edit template — ${initial.name}` : "New template"}
      size="lg"
      onClose={busy ? () => {} : onClose}
      footer={
        <>
          <button type="button" style={footerCancelStyle} onClick={onClose} disabled={busy}>
            {readOnly ? "CLOSE" : "CANCEL"}
          </button>
          {!readOnly && (
            <button
              type="button"
              style={footerPrimaryStyle(valid && !busy)}
              disabled={!valid || busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await onSubmit({
                    name,
                    kind,
                    language,
                    product_id: productId === ANY_PRODUCT ? null : productId,
                    body,
                    active,
                    is_default: isDefault,
                    wa_template_name: waName.trim() || null,
                    wa_template_language: waLang.trim() || "en_US",
                    wa_body_params: waParams,
                  });
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "SAVING…" : initial ? "SAVE CHANGES" : "CREATE TEMPLATE"}
            </button>
          )}
        </>
      }
    >
      <div style={{ display: "grid", gap: 14 }}>
        <FieldRow>
          <Field label="Template name">
            <input className="admin-input" value={name} onChange={(e) => setName(e.target.value)} disabled={readOnly} placeholder="Subscription delivered (English)" />
          </Field>
          <Field label="Type">
            <StyledSelect
              value={kind}
              onChange={(v) => setKind(v as MessageKind)}
              placeholder="Type"
              icon="fa-tag"
              disabled={readOnly}
              options={MESSAGE_KINDS.map((k) => ({ value: k, label: KIND_LABELS[k] }))}
            />
          </Field>
        </FieldRow>

        <FieldRow>
          <Field label="Language">
            <StyledSelect
              value={language}
              onChange={setLanguage}
              placeholder="Language"
              icon="fa-language"
              disabled={readOnly}
              options={LANGUAGES.map((l) => ({ value: l.value, label: l.label }))}
            />
          </Field>
          <Field label="Product" hint="Scope this wording to one subscription, or leave it as Any product.">
            <StyledSelect
              value={productId}
              onChange={setProductId}
              placeholder="Any product"
              icon="fa-box"
              disabled={readOnly}
              options={[{ value: ANY_PRODUCT, label: "Any product" }, ...products.map((p) => ({ value: p.id, label: p.name }))]}
            />
          </Field>
        </FieldRow>

        <Field label="Message body" hint="Click a variable below to insert it. Empty variables are dropped when the message is rendered.">
          <textarea
            className="admin-input admin-textarea"
            rows={14}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            disabled={readOnly}
            style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "0.82rem", lineHeight: 1.6 }}
          />
        </Field>

        {!readOnly && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {TEMPLATE_VARIABLES.map((v) => (
              <button
                key={v.key}
                type="button"
                onClick={() => insert(v.key)}
                title={`${v.label}${v.auto ? " (filled automatically)" : ""}`}
                style={{
                  background: "var(--surface-2, rgba(255,255,255,0.05))",
                  border: "1px solid var(--border)",
                  borderRadius: 999,
                  padding: "4px 10px",
                  fontSize: "0.74rem",
                  color: v.auto ? "var(--text-muted)" : "var(--text)",
                  cursor: "pointer",
                }}
              >
                {`{{${v.key}}}`}
              </button>
            ))}
          </div>
        )}

        <MetaTemplateFields
          readOnly={readOnly}
          name={waName}
          language={waLang}
          params={waParams}
          onName={setWaName}
          onLanguage={setWaLang}
          onParams={setWaParams}
        />

        <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: "0.85rem", color: "var(--text-muted)", cursor: readOnly ? "default" : "pointer" }}>
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} disabled={readOnly} />
            Active
          </label>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: "0.85rem", color: "var(--text-muted)", cursor: readOnly ? "default" : "pointer" }}>
            <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} disabled={readOnly} />
            Use as the default for this type / language
          </label>
        </div>

        <div>
          <button type="button" className="admin-btn admin-btn-ghost" onClick={() => setShowPreview((v) => !v)}>
            <i className={`fa-solid ${showPreview ? "fa-chevron-up" : "fa-eye"}`} style={{ marginRight: 6 }} />
            {showPreview ? "Hide preview" : "Preview with sample data"}
          </button>
          {showPreview && (
            <div style={{ marginTop: 10 }}>
              <div
                className="admin-scroll"
                style={{
                  background: "#075E54", color: "#fff", borderRadius: "10px 10px 10px 2px",
                  padding: "10px 12px", fontSize: "0.86rem", lineHeight: 1.55,
                  whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: 300, overflowY: "auto",
                }}
              >
                {preview.text || "Nothing to preview yet."}
              </div>
              {preview.unknown.length > 0 && (
                <div style={{ ...flashStyle("err"), marginTop: 10, fontSize: "0.8rem" }}>
                  Unknown variables: {preview.unknown.map((k) => `{{${k}}}`).join(", ")} — these are removed when the message is sent.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </ModalShell>
  );
}

/**
 * Meta-approved-template mapping.
 *
 * The Cloud API only delivers free-form text inside the 24-hour window that
 * opens when the customer messages you. A delivery goes out right after a
 * purchase, so it needs a template Meta has approved, with our values slotted
 * into its {{1}}, {{2}} … placeholders — which is what these fields describe.
 */
function MetaTemplateFields({
  readOnly, name, language, params, onName, onLanguage, onParams,
}: {
  readOnly: boolean;
  name: string;
  language: string;
  params: string[];
  onName: (v: string) => void;
  onLanguage: (v: string) => void;
  onParams: (v: string[]) => void;
}) {
  const enabled = name.trim().length > 0;

  function addParam(key: string) {
    onParams([...params, key]);
  }
  function removeParam(index: number) {
    onParams(params.filter((_, i) => i !== index));
  }
  function move(index: number, delta: number) {
    const next = [...params];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onParams(next);
  }

  return (
    <section
      style={{
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: "14px 16px",
        background: "var(--surface-2, rgba(255,255,255,0.02))",
      }}
    >
      <h3 style={{ margin: "0 0 4px", fontFamily: "var(--font-heading)", fontSize: "0.75rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: 700 }}>
        <i className="fa-brands fa-whatsapp" style={{ marginRight: 6, color: "#22c55e" }} />
        WhatsApp Cloud API delivery
      </h3>
      <p className="admin-help" style={{ marginTop: 0 }}>
        Leave the name blank to send this as free-form text — that only reaches a customer who
        messaged you in the last 24 hours. Fill it in with a template you&rsquo;ve had approved in
        Meta&rsquo;s WhatsApp Manager to send at any time.
      </p>

      <FieldRow>
        <Field label="Approved template name" hint="Lowercase, numbers, underscores — exactly as in WhatsApp Manager.">
          <input
            className="admin-input"
            value={name}
            onChange={(e) => onName(e.target.value)}
            disabled={readOnly}
            placeholder="subscription_delivered"
            spellCheck={false}
          />
        </Field>
        <Field label="Template language" hint="The locale of the approved template, e.g. en_US.">
          <input
            className="admin-input"
            value={language}
            onChange={(e) => onLanguage(e.target.value)}
            disabled={readOnly || !enabled}
            placeholder="en_US"
            spellCheck={false}
          />
        </Field>
      </FieldRow>

      {enabled && (
        <div style={{ marginTop: 12 }}>
          <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 500 }}>
            Body variables, in Meta&rsquo;s order
          </span>
          <p className="admin-help" style={{ marginTop: 4 }}>
            The first entry fills <code>{"{{1}}"}</code> in the approved body, the second{" "}
            <code>{"{{2}}"}</code>, and so on. The count must match the approved template exactly.
          </p>

          {params.length === 0 ? (
            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: "6px 0 8px" }}>
              No variables mapped — use this only if the approved body has no placeholders.
            </p>
          ) : (
            <ol style={{ margin: "8px 0", paddingLeft: 20, display: "grid", gap: 6 }}>
              {params.map((key, i) => (
                <li key={`${key}-${i}`} style={{ fontSize: "0.84rem" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <code style={{ color: "#4884FF" }}>{`{{${i + 1}}}`}</code>
                    <span>→</span>
                    <code>{key}</code>
                    {!readOnly && (
                      <>
                        <IconBtn icon="fa-arrow-up" title="Move up" onClick={() => move(i, -1)} />
                        <IconBtn icon="fa-arrow-down" title="Move down" onClick={() => move(i, 1)} />
                        <IconBtn icon="fa-xmark" title="Remove" color="#F54848" onClick={() => removeParam(i)} />
                      </>
                    )}
                  </span>
                </li>
              ))}
            </ol>
          )}

          {!readOnly && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
              {TEMPLATE_VARIABLES.map((v) => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => addParam(v.key)}
                  title={`Append ${v.label} as {{${params.length + 1}}}`}
                  style={{
                    background: "var(--surface-2, rgba(255,255,255,0.05))",
                    border: "1px solid var(--border)",
                    borderRadius: 999,
                    padding: "4px 10px",
                    fontSize: "0.74rem",
                    color: "var(--text)",
                    cursor: "pointer",
                  }}
                >
                  + {v.key}
                </button>
              ))}
            </div>
          )}

          <p className="admin-help" style={{ marginTop: 10 }}>
            Newlines in a value are flattened to <code>·</code> before sending — Meta rejects
            template parameters containing line breaks.
          </p>
        </div>
      )}
    </section>
  );
}

function VariableReference() {
  return (
    <section style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px 18px", marginTop: 16 }}>
      <h2 style={{ margin: "0 0 12px", fontFamily: "var(--font-heading)", fontSize: "0.75rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: 700 }}>
        Available variables
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "8px 18px" }}>
        {TEMPLATE_VARIABLES.map((v) => (
          <div key={v.key} style={{ display: "flex", gap: 8, alignItems: "baseline", fontSize: "0.82rem" }}>
            <code style={{ color: "#4884FF" }}>{`{{${v.key}}}`}</code>
            <span style={{ color: "var(--text-muted)" }}>
              {v.label}
              {v.auto && " · auto"}
            </span>
          </div>
        ))}
      </div>
      <p className="admin-help" style={{ marginTop: 12 }}>
        <code>{"{{variable}}"}</code> and <code>{"{variable}"}</code> both work. Variables marked <em>auto</em> are filled
        from Site settings (business name, contact email, WhatsApp number).
      </p>
    </section>
  );
}
