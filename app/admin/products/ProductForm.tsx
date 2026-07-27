"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import ImagePicker from "../ImagePicker";
import MultiImagePicker from "../MultiImagePicker";
import Select from "@/components/Select";
import TagInput from "../TagInput";
import FeaturesInput from "../FeaturesInput";
import RelatedProductsPicker from "./RelatedProductsPicker";
import ProductReviewsInput, { type ReviewDraft } from "./ProductReviewsInput";
import FloatField from "../FloatField";
import BrandIcon, { SUPPORTED_BRANDS } from "@/components/BrandIcon";
import RichTextEditor from "@/components/RichTextEditor";
import RichTextRenderer from "@/components/RichTextRenderer";
import { createProduct, updateProduct } from "./actions";
import type { ProductRow } from "@/lib/supabase/types";
import {
  ACCOUNT_TYPES,
  type AccountType,
  type ProductVariationConfig,
  normalizeVariationConfig,
  optionId,
} from "@/lib/product-variations";

export type AvailableProduct = { id: string; name: string; category: string; image_url?: string | null };

const CATEGORIES = [
  { value: "ai-subscriptions", label: "AI Subscriptions" },
  { value: "design-tools",     label: "Design & Image" },
  { value: "productivity",     label: "Productivity" },
  { value: "automation",       label: "Automation" },
  { value: "courses",          label: "Courses" },
];

const MEDIA_OPTIONS: { value: MediaValue; label: string; swatch: string }[] = [
  { value: "media-orange", label: "Orange", swatch: "linear-gradient(135deg, #8FB4FF, #4884FF)" },
  { value: "media-blue",   label: "Blue",   swatch: "linear-gradient(135deg, #6dc1ff, #3a7bd5)" },
  { value: "media-pink",   label: "Pink",   swatch: "linear-gradient(135deg, #ff8db8, #d6336c)" },
  { value: "media-green",  label: "Green",  swatch: "linear-gradient(135deg, #7ee2a4, #2da76d)" },
];

const TAG_SUGGESTIONS = ["Popular", "Best Seller", "New", "AI", "Design", "Productivity", "Course", "Business", "Marketing"];

type CategoryValue = "ai-subscriptions" | "design-tools" | "productivity" | "automation" | "courses";
type MediaValue    = "media-orange" | "media-blue" | "media-pink" | "media-green";

const STEPS: { key: string; label: string; hint: string; icon: string }[] = [
  { key: "visual",  label: "Visual",  hint: "Cover image, gallery, card colour",                        icon: "fa-image" },
  { key: "details", label: "Details", hint: "Name, pricing tiers, what's included",                     icon: "fa-feather" },
  { key: "publish", label: "Publish", hint: "Visibility, recommendations, customer reviews",            icon: "fa-rocket" },
];

export default function ProductForm({
  product,
  availableProducts = [],
  productReviews = [],
}: {
  product?: ProductRow;
  availableProducts?: AvailableProduct[];
  productReviews?: ReviewDraft[];
}) {
  const isEdit = !!product;
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string>(product?.image_url ?? "");
  const [gallery, setGallery] = useState<string[]>(Array.isArray(product?.gallery) ? product!.gallery! : []);
  const [category, setCategory] = useState<CategoryValue>((product?.category as CategoryValue) ?? "ai-subscriptions");
  const [mediaClass, setMediaClass] = useState<MediaValue>((product?.media_class as MediaValue) ?? "media-blue");
  const [brand, setBrand] = useState<string>(product?.brand ?? "");
  const [displaySource, setDisplaySource] = useState<"image" | "brand" | "auto">(
    product?.display_source === "image" || product?.display_source === "brand" ? product.display_source : "auto"
  );
  const [variationConfig, setVariationConfig] = useState<ProductVariationConfig>(() =>
    normalizeVariationConfig(product?.variation_config, Number(product?.price ?? 0))
  );

  // Wizard step state. Furthest reached step is tracked so steps the user has
  // already filled in are clickable in the stepper.
  const [step, setStep] = useState(0);
  const [maxReached, setMaxReached] = useState(0);
  const isLast = step === STEPS.length - 1;

  function goTo(i: number) {
    if (i < 0 || i >= STEPS.length) return;
    if (i > maxReached) setMaxReached(i);
    setStep(i);
  }

  function handleSubmit(formData: FormData) {
    if (imageUrl) formData.set("image_url", imageUrl);
    formData.set("gallery", JSON.stringify(gallery));
    formData.set("variation_config", JSON.stringify(variationConfig));
    const firstPlan = variationConfig.plans[0];
    const firstDuration = variationConfig.durations[0];
    const privatePrice = firstPlan && firstDuration
      ? variationConfig.prices.find((p) => p.planId === firstPlan.id && p.durationId === firstDuration.id && p.accountType === "private")?.price
      : 0;
    const sharedPrice = firstPlan && firstDuration
      ? variationConfig.prices.find((p) => p.planId === firstPlan.id && p.durationId === firstDuration.id && p.accountType === "shared")?.price
      : 0;
    formData.set("price", String(privatePrice ?? 0));
    formData.set("private_price", String(sharedPrice ?? ""));
    formData.set("shared_label", firstPlan?.label || "Standard");
    formData.set("private_label", "Shared");
    setError(null);
    startTransition(async () => {
      const action = isEdit ? updateProduct : createProduct;
      const result = await action(formData);
      if (result && "error" in result) setError(result.error);
    });
  }

  function handleInvalid(e: React.FormEvent<HTMLFormElement>) {
    const target = e.target as HTMLElement;
    if (!target?.closest) return;
    const section = target.closest("section[data-step]") as HTMLElement | null;
    if (!section) return;
    const idx = Number(section.dataset.step);
    if (Number.isNaN(idx) || idx === step) return;
    e.preventDefault();
    if (idx > maxReached) setMaxReached(idx);
    setStep(idx);
    requestAnimationFrame(() => {
      const el = target as HTMLInputElement | HTMLTextAreaElement;
      if (typeof el.reportValidity === "function") el.reportValidity();
      el.focus?.();
    });
  }

  return (
    <form action={handleSubmit} onInvalidCapture={handleInvalid} className="admin-form admin-form-narrow">
      {isEdit && <input type="hidden" name="__original_id" value={product!.id} />}

      {/* STEPPER */}
      <ol className="admin-stepper-pro" role="tablist">
        {STEPS.map((s, i) => {
          const status = i === step ? "is-active" : i < step ? "is-done" : "is-future";
          const clickable = i <= maxReached;
          return (
            <li key={s.key} className={`admin-stepper-pro-item ${status}`}>
              <button
                type="button"
                className="admin-stepper-pro-card"
                onClick={() => clickable && goTo(i)}
                disabled={!clickable}
                aria-current={i === step ? "step" : undefined}
              >
                <span className="admin-stepper-pro-dot">
                  {i < step ? <i className="fa-solid fa-check"></i> : <i className={`fa-solid ${s.icon}`}></i>}
                </span>
                <span className="admin-stepper-pro-text">
                  <span className="admin-stepper-pro-num">Step {i + 1} of {STEPS.length}</span>
                  <strong>{s.label}</strong>
                  <small>{s.hint}</small>
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      {error && (
        <div className="admin-card" style={{ background: "rgba(245,72,72,0.10)", borderColor: "rgba(245,72,72,0.30)", color: "#fca5a5" }}>
          {error}
        </div>
      )}

      {/* STEP 1 â€” VISUAL: Brand icon (primary), then cover image override, gallery, card colour */}
      <section className="admin-card" data-step={0} hidden={step !== 0}>
        <header className="admin-section-head">
          <h3>Product visual</h3>
          <p>Pick a brand icon below â€” it's what shows on the shop card and product page. Upload a custom cover image only if you want to override it.</p>
        </header>

        {/* Resolve the effective visual the same way the public ProductCard does. */}
        {(() => {
          const effective: "image" | "brand" | "none" =
            displaySource === "image" ? (imageUrl ? "image" : brand ? "brand" : "none") :
            displaySource === "brand" ? (brand ? "brand" : imageUrl ? "image" : "none") :
            imageUrl ? "image" : brand ? "brand" : "none";
          const showBrandTile = effective === "brand";
          return (
            <div className="admin-product-preview">
              <div
                className={`admin-product-preview-media ${effective === "image" ? mediaClass : "admin-product-preview-plain"}`}
              >
                {effective === "image" ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageUrl} alt="Preview" />
                    {brand && (
                      <span className="admin-product-preview-badge" aria-hidden>
                        <BrandIcon name={brand} size={16} />
                      </span>
                    )}
                  </>
                ) : showBrandTile ? (
                  <span className="admin-product-preview-tile">
                    <BrandIcon name={brand} size={76} />
                  </span>
                ) : (
                  <i className="fa-solid fa-cube" style={{ fontSize: 32, color: "rgba(255,255,255,0.65)" }}></i>
                )}
              </div>
              <div className="admin-product-preview-meta">
                <strong>Live preview</strong>
                <small>
                  {effective === "image"
                    ? brand
                      ? `Image as main, ${SUPPORTED_BRANDS.find((b) => b.slug === brand)?.label || brand} as corner badge.`
                      : "Showing custom cover image."
                    : effective === "brand"
                      ? `Showing brand icon: ${SUPPORTED_BRANDS.find((b) => b.slug === brand)?.label || brand}.`
                      : "No icon selected â€” will fall back to a placeholder."}
                </small>
              </div>
            </div>
          );
        })()}

        {/* Display source toggle â€” only meaningful when both an image AND a brand are set. */}
        {imageUrl && brand && (
          <div style={{ marginTop: 14 }}>
            <label className="admin-label">Show as main visual</label>
            <p className="admin-help" style={{ marginTop: 0, marginBottom: 8 }}>
              You've set both an image and a brand icon. Pick which one fills the card; the other becomes a corner badge.
            </p>
            <div className="admin-display-source">
              {([
                { value: "image", label: "Image" },
                { value: "brand", label: "Brand icon" },
                { value: "auto", label: "Auto (image first)" },
              ] as const).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`admin-display-source-opt ${displaySource === opt.value ? "is-active" : ""}`}
                  onClick={() => setDisplaySource(opt.value)}
                  aria-pressed={displaySource === opt.value}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <input type="hidden" name="display_source" value={displaySource === "auto" ? "" : displaySource} />
          </div>
        )}
        {!(imageUrl && brand) && (
          <input type="hidden" name="display_source" value="" />
        )}

        {/* Brand icon picker â€” primary visual choice. */}
        <div style={{ marginTop: 22 }}>
          <label className="admin-label">Brand icon</label>
          <p className="admin-help" style={{ marginTop: 0, marginBottom: 10 }}>
            Pick the AI tool / provider so its real logo shows on the shop card.
          </p>
          <div className="admin-brand-grid">
            <button
              type="button"
              className={`admin-brand-chip ${brand === "" ? "is-active" : ""}`}
              onClick={() => setBrand("")}
              aria-pressed={brand === ""}
              title="No brand icon"
            >
              <span className="admin-brand-chip-icon" style={{ background: "var(--surface-2)" }}>
                <i className="fa-solid fa-ban" style={{ color: "var(--text-muted)", fontSize: 14 }}></i>
              </span>
              <span className="admin-brand-chip-label">None</span>
            </button>
            {SUPPORTED_BRANDS.map((b) => (
              <button
                key={b.slug}
                type="button"
                className={`admin-brand-chip ${brand === b.slug ? "is-active" : ""}`}
                onClick={() => setBrand(b.slug)}
                aria-pressed={brand === b.slug}
                title={b.label}
              >
                <span className="admin-brand-chip-icon">
                  <BrandIcon name={b.slug} size={22} />
                </span>
                <span className="admin-brand-chip-label">{b.label}</span>
              </button>
            ))}
            {/* "Add your own" chip â€” scrolls to the cover image picker so admins
                can upload any logo not in the static list. */}
            <button
              type="button"
              className={`admin-brand-chip admin-brand-chip-add ${imageUrl ? "is-active" : ""}`}
              onClick={() => {
                setBrand("");
                document.getElementById("custom-cover-image")?.scrollIntoView({ behavior: "smooth", block: "center" });
              }}
              title="Upload a custom logo"
            >
              <span className="admin-brand-chip-icon admin-brand-chip-add-icon">
                <i className="fa-solid fa-plus" style={{ fontSize: 14 }}></i>
              </span>
              <span className="admin-brand-chip-label">{imageUrl ? "Custom âœ“" : "Add custom"}</span>
            </button>
          </div>
          <input type="hidden" name="brand" value={brand} />
        </div>

        {/* Custom cover image â€” optional override for brands not in the list. */}
        <div id="custom-cover-image" style={{ marginTop: 22, scrollMarginTop: 80 }}>
          <label className="admin-label">Custom cover image (your own logo)</label>
          <p className="admin-help" style={{ marginTop: 0, marginBottom: 10 }}>
            Upload any logo or illustration here. Use this when the brand you need isn't in the chip grid above. Overrides the brand icon when set.
          </p>
          <ImagePicker
            value={imageUrl}
            onChange={setImageUrl}
            folder="products"
            tintBackground={MEDIA_OPTIONS.find((m) => m.value === mediaClass)?.swatch}
          />
          <input type="hidden" name="image_url" value={imageUrl} />
        </div>

        <div style={{ marginTop: 18 }}>
          <label className="admin-label">Gallery (optional, up to 4 extra images)</label>
          <MultiImagePicker value={gallery} onChange={setGallery} folder="products/gallery" max={4} />
          <input type="hidden" name="gallery" value={JSON.stringify(gallery)} />
        </div>

        {/* Card colour preserved as a hidden field so the image-gradient frame
            still works for products that use a custom cover image. The visual
            picker was removed in favour of the unified colour picker below. */}
        <input type="hidden" name="media_class" value={mediaClass} />

        {/* Legacy FontAwesome fallback â€” preserved invisibly for existing rows. */}
        <input type="hidden" name="icon_class" value={product?.icon_class ?? "fa-solid fa-cube"} />
      </section>

      {/* STEP 2 â€” DETAILS: Basics */}
      <section className="admin-card" data-step={1} hidden={step !== 1}>
        <header className="admin-section-head">
          <h3>Basics</h3>
          <p>Name, description, and category.</p>
        </header>

        <div className="admin-form-stack">
          <FloatField
            id="name"
            name="name"
            label="Name"
            icon="fa-tag"
            required
            defaultValue={product?.name ?? ""}
            hint={
              isEdit && product?.id
                ? <>URL: <code style={{ color: "var(--text-soft)" }}>/product/{product.id}</code> Â· auto-generated, stays stable on edits</>
                : <>URL is auto-generated from the name (e.g. <code>/product/chatgpt-plus</code>).</>
            }
          />

          <div className="admin-row cols-2">
            <div>
              <label className="admin-label">Category</label>
              <Select<CategoryValue>
                value={category}
                onChange={setCategory}
                options={CATEGORIES as { value: CategoryValue; label: string }[]}
                ariaLabel="Category"
              />
              <input type="hidden" name="category" value={category} />
            </div>
            <div>
              <label className="admin-label">Tags</label>
              <TagInput
                name="tag"
                defaultValue={product?.tag ?? ""}
                placeholder="Type a tag and press commaâ€¦"
                suggestions={TAG_SUGGESTIONS}
                ariaLabel="Tags"
              />
              <p className="admin-help">Press <kbd>,</kbd> or <kbd>Enter</kbd> after each tag.</p>
            </div>
          </div>
        </div>
      </section>

      {/* STEP 2 - DETAILS: Pricing & variations. */}
      <section className="admin-card" data-step={1} hidden={step !== 1}>
        <header className="admin-section-head">
          <h3>Pricing &amp; variations</h3>
          <p>Set up to 3 plans, up to 3 durations, and prices for every Private / Shared combination.</p>
        </header>

        <VariationEditor value={variationConfig} onChange={setVariationConfig} />
        <input type="hidden" name="variation_config" value={JSON.stringify(variationConfig)} />
        <input type="hidden" name="price" value="0" />
        <input type="hidden" name="private_price" value="" />
        <input type="hidden" name="shared_label" value={variationConfig.plans[0]?.label || "Standard"} />
        <input type="hidden" name="private_label" value="Shared" />

        <div style={{ marginTop: 16 }}>
          <DescriptionEditor initial={product?.description ?? ""} />
        </div>
      </section>

      {/* STEP 2 â€” DETAILS: Features (bullet lines under the price) */}
      <section className="admin-card" data-step={1} hidden={step !== 1}>
        <header className="admin-section-head">
          <h3>What&rsquo;s included</h3>
          <p>Bullet lines shown under the price on the product page. Drag to reorder.</p>
        </header>
        <FeaturesInput
          name="features"
          defaultValue={Array.isArray(product?.features) ? product!.features! : []}
          placeholder="Activated within 30 minutes"
          max={12}
        />
      </section>

      {/* STEP 3 â€” PUBLISH: Visibility */}
      <section className="admin-card" data-step={2} hidden={step !== 2}>
        <header className="admin-section-head">
          <h3>Visibility</h3>
          <p>Where this product shows up and in what order.</p>
        </header>

        <div className="admin-row cols-2">
          <FloatField
            id="sort_order"
            name="sort_order"
            type="number"
            step="1"
            label="Sort order"
            icon="fa-arrow-down-1-9"
            defaultValue={product?.sort_order ?? 0}
            hint="Lower numbers appear first on the shop page."
          />
          <div className="admin-toggle-stack">
            <label className="admin-toggle">
              <input type="checkbox" name="in_stock" defaultChecked={product?.in_stock ?? true} />
              <span className="admin-toggle-slider" aria-hidden />
              <span>
                <strong>In stock</strong>
                <small>Appears on the shop and product page.</small>
              </span>
            </label>
            <label className="admin-toggle">
              <input type="checkbox" name="featured" defaultChecked={product?.featured ?? false} />
              <span className="admin-toggle-slider" aria-hidden />
              <span>
                <strong>Featured</strong>
                <small>Pinned to the homepage.</small>
              </span>
            </label>
            <label className="admin-toggle">
              <input type="checkbox" name="show_on_homepage" defaultChecked={product?.show_on_homepage ?? false} />
              <span className="admin-toggle-slider" aria-hidden />
              <span>
                <strong>Show in &ldquo;More tools&rdquo;</strong>
                <small>Displays this product in the second homepage tools section.</small>
              </span>
            </label>
            <label className="admin-toggle">
              <input type="checkbox" name="show_in_related" defaultChecked={product?.show_in_related ?? true} />
              <span className="admin-toggle-slider" aria-hidden />
              <span>
                <strong>Show in &ldquo;You may also like&rdquo;</strong>
                <small>Recommended on other product pages in the same category.</small>
              </span>
            </label>
          </div>
        </div>
      </section>

      {/* STEP 3 â€” PUBLISH: Related products (admin-curated) */}
      <section className="admin-card" data-step={2} hidden={step !== 2}>
        <header className="admin-section-head">
          <h3>You may also like</h3>
          <p>Pick the exact products to recommend on this product&rsquo;s detail page. Leave empty to fall back to category-based suggestions.</p>
        </header>

        <RelatedProductsPicker
          available={availableProducts}
          defaultSelected={Array.isArray(product?.related_product_ids) ? product!.related_product_ids! : []}
          excludeId={product?.id}
          max={8}
        />
      </section>

      {/* STEP 3 â€” PUBLISH: Reviews (per-product) */}
      <section className="admin-card" data-step={2} hidden={step !== 2}>
        <header className="admin-section-head">
          <h3>Customer reviews</h3>
          <p>Reviews shown on this product&rsquo;s detail page. Add as many as you like.</p>
        </header>

        <ProductReviewsInput name="product_reviews" defaultValue={productReviews} />
      </section>

      {/* STEP NAV */}
      <div className="admin-step-nav">
        <Link href="/admin/products" className="admin-btn admin-btn-ghost">Cancel</Link>
        <div className="admin-step-nav-spacer" />
        {step > 0 && (
          <button type="button" className="admin-btn admin-btn-ghost" onClick={() => goTo(step - 1)} disabled={isPending}>
            <i className="fa-solid fa-arrow-left"></i> Back
          </button>
        )}
        {!isLast && (
          <button type="button" className="admin-btn admin-btn-primary" onClick={() => goTo(step + 1)}>
            Next <i className="fa-solid fa-arrow-right"></i>
          </button>
        )}
        {isLast && (
          <button type="submit" className="admin-btn admin-btn-primary" disabled={isPending}>
            {isPending ? (
              <>
                <span className="admin-spinner" />
                {isEdit ? "Savingâ€¦" : "Creatingâ€¦"}
              </>
            ) : (
              <>
                <i className="fa-solid fa-check"></i>
                {isEdit ? " Save changes" : " Create product"}
              </>
            )}
          </button>
        )}
      </div>
    </form>
  );
}

/**
 * Rich-text description field for the product form. Uses TipTap for
 * WYSIWYG editing, offers a live preview toggle, and syncs the HTML
 * output into a hidden input named `description` so the existing
 * Server Action (which does `FormData.get("description")`) needs
 * zero changes.
 */
function DescriptionEditor({ initial }: { initial: string }) {
  const [html, setHtml] = useState(initial);
  const [showPreview, setShowPreview] = useState(false);
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, gap: 12 }}>
        <label style={{ fontSize: "0.9rem", fontWeight: 600 }}>
          Description / what&apos;s included
        </label>
        <button
          type="button"
          onClick={() => setShowPreview((v) => !v)}
          style={{
            background: "none", border: "1px solid var(--border)", borderRadius: 6,
            padding: "4px 10px", fontSize: "0.75rem", color: "var(--text-muted)",
            cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6,
          }}
          aria-pressed={showPreview}
        >
          <i className={`fa-solid ${showPreview ? "fa-eye-slash" : "fa-eye"}`} />
          {showPreview ? "Hide preview" : "Show preview"}
        </button>
      </div>
      <p style={{ color: "var(--text-muted)", fontSize: "0.78rem", margin: "0 0 10px" }}>
        Paste content from ChatGPT or write it here — headings, bullets, bold text and
        paragraphs are preserved and rendered on the product page.
      </p>
      <RichTextEditor name="description" defaultValue={initial} onChange={setHtml} />
      {showPreview && (
        <div style={{
          marginTop: 12, padding: 16,
          border: "1px dashed var(--border)", borderRadius: 10,
          background: "var(--surface-2, rgba(255,255,255,0.02))",
        }}>
          <div style={{ fontSize: "0.7rem", letterSpacing: "0.08em", fontWeight: 700, color: "var(--text-muted)", marginBottom: 10, textTransform: "uppercase" }}>
            Live preview
          </div>
          <RichTextRenderer
            content={html}
            fallback={
              <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", fontStyle: "italic" }}>
                Nothing to preview yet — start writing above.
              </div>
            }
          />
        </div>
      )}
    </div>
  );
}

function VariationEditor({
  value,
  onChange,
}: {
  value: ProductVariationConfig;
  onChange: (next: ProductVariationConfig) => void;
}) {
  const updateOption = (kind: "plans" | "durations", idx: number, label: string) => {
    const nextOptions = value[kind].map((opt, i) => (
      i === idx ? { id: optionId(label, `${kind}-${idx + 1}`), label } : opt
    )).filter((opt) => opt.label.trim()).slice(0, 3);
    onChange(ensurePriceMatrix({ ...value, [kind]: nextOptions }));
  };

  const addOption = (kind: "plans" | "durations") => {
    if (value[kind].length >= 3) return;
    const label = kind === "plans" ? `Plan ${value.plans.length + 1}` : `${value.durations.length + 1} Month`;
    const next = {
      ...value,
      [kind]: [...value[kind], { id: optionId(label, `${kind}-${value[kind].length + 1}`), label }],
    };
    onChange(ensurePriceMatrix(next));
  };

  const removeOption = (kind: "plans" | "durations", idx: number) => {
    if (value[kind].length <= 1) return;
    const next = { ...value, [kind]: value[kind].filter((_, i) => i !== idx) };
    onChange(ensurePriceMatrix(next));
  };

  const setPrice = (planId: string, accountType: AccountType, durationId: string, price: number) => {
    const prices = value.prices.filter((p) => !(p.planId === planId && p.accountType === accountType && p.durationId === durationId));
    prices.push({ planId, accountType, durationId, price: Number.isFinite(price) && price >= 0 ? price : 0 });
    onChange({ ...value, prices });
  };

  const getPrice = (planId: string, accountType: AccountType, durationId: string) =>
    value.prices.find((p) => p.planId === planId && p.accountType === accountType && p.durationId === durationId)?.price ?? 0;

  return (
    <div className="admin-variation-editor">
      <VariationOptionList
        title="Plan options"
        kind="plans"
        options={value.plans}
        onAdd={addOption}
        onRemove={removeOption}
        onUpdate={updateOption}
        placeholder="Essential"
      />
      <VariationOptionList
        title="Duration options"
        kind="durations"
        options={value.durations}
        onAdd={addOption}
        onRemove={removeOption}
        onUpdate={updateOption}
        placeholder="1 Month"
      />

      <div className="admin-variation-matrix">
        <label className="admin-label">Combination pricing</label>
        <p className="admin-help">Prices are in PKR. Account Type is fixed as Private and Shared.</p>
        {value.plans.map((plan) => (
          <div key={plan.id} className="admin-variation-plan-block">
            <h4>{plan.label}</h4>
            <div className="admin-variation-price-grid">
              {value.durations.map((duration) => (
                ACCOUNT_TYPES.map((account) => (
                  <label key={`${plan.id}-${account.id}-${duration.id}`} className="admin-variation-price-cell">
                    <span>{account.label} + {duration.label}</span>
                    <div className="admin-input-prefix">
                      <span>Rs</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={getPrice(plan.id, account.id, duration.id)}
                        onChange={(e) => setPrice(plan.id, account.id, duration.id, Number(e.target.value))}
                      />
                    </div>
                  </label>
                ))
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function VariationOptionList({
  title,
  kind,
  options,
  placeholder,
  onAdd,
  onRemove,
  onUpdate,
}: {
  title: string;
  kind: "plans" | "durations";
  options: ProductVariationConfig["plans"];
  placeholder: string;
  onAdd: (kind: "plans" | "durations") => void;
  onRemove: (kind: "plans" | "durations", idx: number) => void;
  onUpdate: (kind: "plans" | "durations", idx: number, label: string) => void;
}) {
  return (
    <div className="admin-variation-options">
      <div className="admin-variation-options-head">
        <label className="admin-label">{title}</label>
        <button type="button" className="admin-btn admin-btn-ghost admin-btn-mini" onClick={() => onAdd(kind)} disabled={options.length >= 3}>
          <i className="fa-solid fa-plus"></i> Add
        </button>
      </div>
      <div className="admin-variation-option-list">
        {options.map((opt, idx) => (
          <div key={`${kind}-${idx}`} className="admin-variation-option-row">
            <input
              className="input"
              value={opt.label}
              placeholder={placeholder}
              onChange={(e) => onUpdate(kind, idx, e.target.value)}
            />
            <button type="button" className="product-icon-action" onClick={() => onRemove(kind, idx)} disabled={options.length <= 1} aria-label="Remove option">
              <i className="fa-solid fa-trash"></i>
            </button>
          </div>
        ))}
      </div>
      <p className="admin-help">Maximum 3.</p>
    </div>
  );
}

function ensurePriceMatrix(config: ProductVariationConfig): ProductVariationConfig {
  const plans = config.plans.slice(0, 3);
  const durations = config.durations.slice(0, 3);
  const prices = [];
  for (const plan of plans) {
    for (const duration of durations) {
      for (const account of ACCOUNT_TYPES) {
        const existing = config.prices.find((p) => p.planId === plan.id && p.durationId === duration.id && p.accountType === account.id);
        prices.push({
          planId: plan.id,
          durationId: duration.id,
          accountType: account.id,
          price: existing?.price ?? 0,
        });
      }
    }
  }
  return { plans, durations, prices };
}
