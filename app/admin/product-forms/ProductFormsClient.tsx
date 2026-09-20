"use client";

/**
 * Product forms — create the form, hand out the link, watch requests arrive.
 *
 * Each row publishes <origin>/forms/<slug>. Disabling a form makes that URL
 * 404 without deleting the requests it already collected.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  PLAN_DURATIONS,
  PRODUCT_FORM_TYPES,
  durationLabel,
  formUrl,
  priceLabel,
  productTypeLabel,
  slugifyFormName,
  type ProductFormRow,
} from "@/lib/product-forms";
import {
  createProductForm,
  deleteProductForm,
  regenerateFormLink,
  setProductFormActive,
  updateProductForm,
  type ProductFormInput,
} from "./actions";
import {
  ConfirmModal,
  Field,
  FieldRow,
  IconBtn,
  ModalShell,
  Pill,
  StatCard,
  StyledSelect,
  Td,
  Th,
  flashStyle,
  footerCancelStyle,
  footerPrimaryStyle,
} from "../delivery/ui";

type Product = { id: string; name: string; price: number };

const NO_PRODUCT = "__none__";

export default function ProductFormsClient({
  initialForms,
  products,
  counts,
  origin,
  canWrite,
  canDelete,
}: {
  initialForms: ProductFormRow[];
  products: Product[];
  counts: Record<string, { total: number; pending: number }>;
  origin: string;
  canWrite: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [forms, setForms] = useState(initialForms);
  const [flash, setFlash] = useState<{ kind: "ok" | "err" | "warn"; msg: string } | null>(null);
  const [editing, setEditing] = useState<ProductFormRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<ProductFormRow | null>(null);
  const [confirmRegen, setConfirmRegen] = useState<ProductFormRow | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  function notify(kind: "ok" | "err" | "warn", msg: string) {
    setFlash({ kind, msg });
    setTimeout(() => setFlash(null), 5000);
  }

  const stats = useMemo(() => {
    const active = forms.filter((f) => f.active).length;
    const pending = Object.values(counts).reduce((a, c) => a + c.pending, 0);
    const total = Object.values(counts).reduce((a, c) => a + c.total, 0);
    return { total: forms.length, active, pending, requests: total };
  }, [forms, counts]);

  async function copyLink(form: ProductFormRow) {
    const url = formUrl(origin, form.slug);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(form.id);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      notify("err", "Your browser blocked the clipboard. Select the link text and copy it manually.");
    }
  }

  async function submit(input: ProductFormInput, id?: string) {
    const res = id ? await updateProductForm(id, input) : await createProductForm(input);
    if (!res.ok) { notify("err", res.error); return false; }
    const row = res.data as ProductFormRow;
    setForms((prev) => (id ? prev.map((f) => (f.id === id ? row : f)) : [row, ...prev]));
    notify("ok", id ? "Form updated." : `Form created — its link is ${formUrl(origin, row.slug)}`);
    router.refresh();
    return true;
  }

  async function toggleActive(form: ProductFormRow) {
    const res = await setProductFormActive(form.id, !form.active);
    if (!res.ok) { notify("err", res.error); return; }
    setForms((prev) => prev.map((f) => (f.id === form.id ? (res.data as ProductFormRow) : f)));
    notify("ok", form.active ? "Form disabled — its link now returns a not-found page." : "Form enabled.");
    router.refresh();
  }

  async function regenerate(form: ProductFormRow) {
    const res = await regenerateFormLink(form.id);
    if (!res.ok) { notify("err", res.error); return; }
    const row = res.data as ProductFormRow;
    setForms((prev) => prev.map((f) => (f.id === form.id ? row : f)));
    notify("warn", `New link issued: ${formUrl(origin, row.slug)} — the previous one no longer works.`);
    router.refresh();
  }

  async function remove(form: ProductFormRow) {
    const res = await deleteProductForm(form.id);
    if (!res.ok) { notify("err", res.error); return; }
    setForms((prev) => prev.filter((f) => f.id !== form.id));
    notify("ok", "Form deleted.");
    router.refresh();
  }

  return (
    <div>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18, gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "1.65rem", margin: "0 0 4px" }}>Product forms</h1>
          <p style={{ color: "var(--text-muted)", margin: 0, fontSize: "0.92rem" }}>
            Each form publishes a link you can send a customer. What they submit lands in Sale requests.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href="/admin/sale-requests" className="admin-btn admin-btn-ghost">
            <i className="fa-solid fa-inbox" style={{ marginRight: 6 }} /> Sale requests
            {stats.pending > 0 && <span style={{ marginLeft: 6 }}>({stats.pending})</span>}
          </Link>
          {canWrite && (
            <button className="admin-btn admin-btn-primary" onClick={() => setCreating(true)}>
              <i className="fa-solid fa-plus" /> New form
            </button>
          )}
        </div>
      </header>

      {flash && <div style={{ ...flashStyle(flash.kind), marginBottom: 14 }}>{flash.msg}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 18 }}>
        <StatCard icon="fa-file-lines" tone="brand" label="Forms" value={stats.total} />
        <StatCard icon="fa-circle-check" tone="ok" label="Active" value={stats.active} />
        <StatCard icon="fa-inbox" tone="brand" label="Requests received" value={stats.requests} />
        <StatCard icon="fa-hourglass-half" tone="warn" label="Awaiting approval" value={stats.pending} />
      </div>

      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        {forms.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-muted)" }}>
            <i className="fa-solid fa-file-circle-plus" style={{ fontSize: 28, marginBottom: 10, display: "block" }} />
            <div style={{ fontWeight: 600, color: "var(--text)" }}>No forms yet</div>
            <div style={{ fontSize: "0.85rem", marginTop: 4 }}>
              {canWrite
                ? <>Create one and you&apos;ll get a link like <code>{origin}/forms/chatgpt-plus</code> to send customers.</>
                : "Ask an admin to create the first form."}
            </div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
              <thead>
                <tr style={{ background: "var(--surface-2, rgba(255,255,255,0.03))" }}>
                  <Th>Form</Th>
                  <Th>Product</Th>
                  <Th>Price</Th>
                  <Th>Link</Th>
                  <Th>Requests</Th>
                  <Th style={{ textAlign: "right" }}>Actions</Th>
                </tr>
              </thead>
              <tbody>
                {forms.map((form) => {
                  const url = formUrl(origin, form.slug);
                  const c = counts[form.id] || { total: 0, pending: 0 };
                  return (
                    <tr key={form.id} style={{ borderTop: "1px solid var(--border)" }}>
                      <Td>
                        <div style={{ fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}>
                          {form.name}
                          <Pill tone={form.active ? "ok" : "neutral"}>{form.active ? "ACTIVE" : "DISABLED"}</Pill>
                        </div>
                        <div style={{ color: "var(--text-muted)", fontSize: "0.78rem", marginTop: 2 }}>
                          {productTypeLabel(form.product_type)} · {durationLabel(form.plan_duration)}
                        </div>
                      </Td>
                      <Td>
                        <div>{form.product_name}</div>
                        {form.product_id && (
                          <div style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
                            linked to <code>{form.product_id}</code>
                          </div>
                        )}
                      </Td>
                      <Td style={{ whiteSpace: "nowrap" }}>
                        {priceLabel(form.price, form.currency, form.plan_duration)}
                      </Td>
                      <Td>
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: "var(--brand-300, #8FB4FF)", fontSize: "0.8rem", wordBreak: "break-all" }}
                        >
                          /forms/{form.slug}
                        </a>
                      </Td>
                      <Td style={{ whiteSpace: "nowrap" }}>
                        {c.total}
                        {c.pending > 0 && (
                          <span style={{ color: "#F59622", marginLeft: 6, fontSize: "0.78rem" }}>
                            {c.pending} pending
                          </span>
                        )}
                      </Td>
                      <Td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        <div style={{ display: "inline-flex", gap: 6 }}>
                          <IconBtn
                            icon={copied === form.id ? "fa-check" : "fa-copy"}
                            title="Copy link"
                            color={copied === form.id ? "#22c55e" : undefined}
                            onClick={() => copyLink(form)}
                          />
                          {canWrite && (
                            <IconBtn
                              icon={form.active ? "fa-toggle-on" : "fa-toggle-off"}
                              title={form.active ? "Disable form" : "Enable form"}
                              color={form.active ? "#22c55e" : undefined}
                              onClick={() => toggleActive(form)}
                            />
                          )}
                          {canWrite && <IconBtn icon="fa-pen" title="Edit" onClick={() => setEditing(form)} />}
                          {canWrite && (
                            <IconBtn icon="fa-arrows-rotate" title="Generate a new link" onClick={() => setConfirmRegen(form)} />
                          )}
                          {canDelete && (
                            <IconBtn icon="fa-trash" title="Delete" color="#F54848" onClick={() => setConfirmDelete(form)} />
                          )}
                        </div>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {(creating || editing) && (
        <FormEditor
          key={editing?.id ?? "new"}
          initial={editing}
          products={products}
          origin={origin}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSubmit={async (input) => {
            const ok = await submit(input, editing?.id);
            if (ok) { setCreating(false); setEditing(null); }
          }}
        />
      )}

      {confirmRegen && (
        <ConfirmModal
          title="Generate a new link?"
          danger
          confirmLabel="Generate new link"
          message={
            <>
              The current link <code>/forms/{confirmRegen.slug}</code> stops working immediately. Anyone who already
              has it — including customers mid-way through the form — will get a not-found page. Requests already
              submitted are unaffected.
            </>
          }
          onCancel={() => setConfirmRegen(null)}
          onConfirm={async () => {
            const row = confirmRegen;
            setConfirmRegen(null);
            await regenerate(row);
          }}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          title={`Delete "${confirmDelete.name}"?`}
          confirmLabel="Delete"
          message={
            <>
              The form and its link are removed for good. Requests it already collected stay in Sale requests.
              To simply stop taking new requests, disable it instead.
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

function FormEditor({
  initial, products, origin, onClose, onSubmit,
}: {
  initial: ProductFormRow | null;
  products: Product[];
  origin: string;
  onClose: () => void;
  onSubmit: (input: ProductFormInput) => Promise<void>;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [productType, setProductType] = useState<string>(initial?.product_type ?? "subscription");
  const [productId, setProductId] = useState(initial?.product_id ?? NO_PRODUCT);
  const [productName, setProductName] = useState(initial?.product_name ?? "");
  const [duration, setDuration] = useState<string>(initial?.plan_duration ?? "monthly");
  const [renewalNote, setRenewalNote] = useState(initial?.renewal_note ?? "");
  const [price, setPrice] = useState(initial?.price != null ? String(initial.price) : "");
  const [currency, setCurrency] = useState(initial?.currency ?? "PKR");
  const [intro, setIntro] = useState(initial?.intro ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [active, setActive] = useState(initial?.active ?? true);
  const [busy, setBusy] = useState(false);

  // Picking a catalog product fills the name and price, but both stay editable
  // — a form can advertise a different price from the shop listing.
  function pickProduct(value: string) {
    setProductId(value);
    if (value === NO_PRODUCT) return;
    const product = products.find((p) => p.id === value);
    if (!product) return;
    if (!productName.trim()) setProductName(product.name);
    if (!price.trim()) setPrice(String(product.price));
    if (!name.trim()) setName(`${product.name} plan`);
  }

  const previewSlug = slug.trim() || slugifyFormName(name) || "your-form";
  const valid = name.trim().length > 0 && productName.trim().length > 0;

  return (
    <ModalShell
      title={initial ? `Edit form — ${initial.name}` : "New product form"}
      size="lg"
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
                  name,
                  product_type: productType,
                  product_id: productId === NO_PRODUCT ? null : productId,
                  product_name: productName,
                  plan_duration: duration,
                  renewal_note: renewalNote || null,
                  price: price.trim() === "" ? null : Number(price),
                  currency,
                  intro: intro || null,
                  active,
                  // Only send a slug when the admin typed one, so editing a
                  // form doesn't silently move its published link.
                  slug: initial ? (slug.trim() !== initial.slug ? slug.trim() : null) : slug.trim() || null,
                });
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "SAVING…" : initial ? "SAVE CHANGES" : "CREATE FORM"}
          </button>
        </>
      }
    >
      <div style={{ display: "grid", gap: 14 }}>
        <FieldRow>
          <Field label="Form name" hint="Shown as the page heading, e.g. ChatGPT Plus Plan.">
            <input className="admin-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="ChatGPT Plus Plan" />
          </Field>
          <Field label="Product type">
            <StyledSelect
              value={productType}
              onChange={setProductType}
              placeholder="Type"
              icon="fa-tag"
              options={PRODUCT_FORM_TYPES.map((t) => ({ value: t.value, label: t.label }))}
            />
          </Field>
        </FieldRow>

        <FieldRow>
          <Field label="Catalog product (optional)" hint="Link it to tie sales back to a product, or leave it unlinked.">
            <StyledSelect
              value={productId}
              onChange={pickProduct}
              placeholder="Not linked"
              icon="fa-box"
              options={[
                { value: NO_PRODUCT, label: "Not linked to a catalog product" },
                ...products.map((p) => ({ value: p.id, label: p.name, hint: `Rs ${Number(p.price).toLocaleString("en-PK")}` })),
              ]}
            />
          </Field>
          <Field label="Product name" hint="What the customer sees on the form.">
            <input className="admin-input" value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="ChatGPT Plus" />
          </Field>
        </FieldRow>

        <FieldRow min={150}>
          <Field label="Plan duration" hint="Sets the renewal date when a request is accepted.">
            <StyledSelect
              value={duration}
              onChange={setDuration}
              placeholder="Duration"
              icon="fa-calendar-days"
              options={PLAN_DURATIONS.map((d) => ({ value: d.value, label: d.label }))}
            />
          </Field>
          <Field label="Price" hint="Leave empty for “price on request”.">
            <input className="admin-input" value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" placeholder="500" />
          </Field>
          <Field label="Currency">
            <input className="admin-input" value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="PKR" />
          </Field>
        </FieldRow>

        <Field label="Renewal note (optional)" hint="Free text shown to the customer, e.g. Monthly Renewable.">
          <input className="admin-input" value={renewalNote} onChange={(e) => setRenewalNote(e.target.value)} placeholder="Monthly Renewable" />
        </Field>

        <Field label="Intro text (optional)" hint="A line or two above the form fields.">
          <textarea className="admin-input admin-textarea" rows={2} value={intro} onChange={(e) => setIntro(e.target.value)} />
        </Field>

        <Field
          label="Link"
          hint={
            initial
              ? "Changing this breaks any link already shared. Leave it alone unless you mean to."
              : "Left empty, it's generated from the form name."
          }
        >
          <input className="admin-input" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder={slugifyFormName(name) || "chatgpt-plus"} spellCheck={false} />
        </Field>

        <p className="admin-help" style={{ marginTop: -4 }}>
          Customers will open <code>{origin}/forms/{previewSlug}</code>
        </p>

        <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: "0.85rem", color: "var(--text-muted)", cursor: "pointer" }}>
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          Active — the link accepts submissions
        </label>
      </div>
    </ModalShell>
  );
}
