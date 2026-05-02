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
import { createProduct, updateProduct } from "./actions";
import type { ProductRow } from "@/lib/supabase/types";

export type AvailableProduct = { id: string; name: string; category: string; image_url?: string | null };

const CATEGORIES = [
  { value: "ai-subscriptions", label: "AI Subscriptions" },
  { value: "design-tools",     label: "Design & Image" },
  { value: "productivity",     label: "Productivity" },
  { value: "automation",       label: "Automation" },
  { value: "courses",          label: "Courses" },
];

const MEDIA_OPTIONS: { value: MediaValue; label: string; swatch: string }[] = [
  { value: "media-orange", label: "Orange", swatch: "linear-gradient(135deg, #ff9d57, #ff7a1a)" },
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
    setError(null);
    startTransition(async () => {
      const action = isEdit ? updateProduct : createProduct;
      const result = await action(formData);
      if (result && "error" in result) setError(result.error);
    });
  }

  return (
    <form action={handleSubmit} className="admin-form admin-form-narrow">
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
        <div className="admin-card" style={{ background: "rgba(239,68,68,0.10)", borderColor: "rgba(239,68,68,0.30)", color: "#fca5a5" }}>
          {error}
        </div>
      )}

      {/* STEP 1 — VISUAL: Cover image + gallery + card colour */}
      <section className="admin-card" hidden={step !== 0}>
        <header className="admin-section-head">
          <h3>Cover image</h3>
          <p>This is what shows up on the shop card and the product page.</p>
        </header>

        <ImagePicker
          value={imageUrl}
          onChange={setImageUrl}
          folder="products"
          tintBackground={MEDIA_OPTIONS.find((m) => m.value === mediaClass)?.swatch}
        />
        <input type="hidden" name="image_url" value={imageUrl} />

        <div style={{ marginTop: 18 }}>
          <label className="admin-label">Gallery (optional, up to 4 extra images)</label>
          <MultiImagePicker value={gallery} onChange={setGallery} folder="products/gallery" max={4} />
          <input type="hidden" name="gallery" value={JSON.stringify(gallery)} />
        </div>

        <div style={{ marginTop: 18 }}>
          <label className="admin-label">Card colour</label>
          <div className="admin-swatch-row" role="radiogroup" aria-label="Card colour">
            {MEDIA_OPTIONS.map((m) => (
              <button
                key={m.value}
                type="button"
                role="radio"
                aria-checked={mediaClass === m.value}
                className={`admin-swatch ${mediaClass === m.value ? "is-active" : ""}`}
                onClick={() => setMediaClass(m.value)}
                title={m.label}
                style={{ background: m.swatch }}
              >
                {mediaClass === m.value && <i className="fa-solid fa-check"></i>}
              </button>
            ))}
          </div>
          <input type="hidden" name="media_class" value={mediaClass} />
          <p className="admin-help">Used as a fallback tint when the image is missing or still loading.</p>
        </div>

        {/* Keep legacy fallbacks hidden so existing seed rows don't lose them. */}
        <input type="hidden" name="brand" value={product?.brand ?? ""} />
        <input type="hidden" name="icon_class" value={product?.icon_class ?? "fa-solid fa-cube"} />
      </section>

      {/* STEP 2 — DETAILS: Basics */}
      <section className="admin-card" hidden={step !== 1}>
        <header className="admin-section-head">
          <h3>Basics</h3>
          <p>Name, description, and category.</p>
        </header>

        <div className="admin-form-stack">
          <div>
            <label className="admin-label" htmlFor="name">Name</label>
            <input id="name" name="name" required className="admin-input" defaultValue={product?.name ?? ""} placeholder="ChatGPT Plus Plan" />
            {isEdit && product?.id ? (
              <p className="admin-help">
                URL: <code style={{ color: "var(--text-soft)" }}>/product/{product.id}</code> · auto-generated, stays stable on edits
              </p>
            ) : (
              <p className="admin-help">URL is auto-generated from the name (e.g. <code>/product/chatgpt-plus</code>).</p>
            )}
          </div>

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
                placeholder="Type a tag and press comma…"
                suggestions={TAG_SUGGESTIONS}
                ariaLabel="Tags"
              />
              <p className="admin-help">Press <kbd>,</kbd> or <kbd>Enter</kbd> after each tag.</p>
            </div>
          </div>
        </div>
      </section>

      {/* STEP 2 — DETAILS: Pricing & packages */}
      <section className="admin-card" hidden={step !== 1}>
        <header className="admin-section-head">
          <h3>Pricing &amp; packages</h3>
          <p>Two tiers shown side-by-side on the product page. Leave the Private tier empty if you only sell shared.</p>
        </header>

        <div className="admin-row cols-2">
          {/* Shared tier (uses the existing price + description columns) */}
          <div className="admin-package-card">
            <div className="admin-package-card-head">
              <i className="fa-solid fa-users"></i>
              <input
                type="text"
                name="shared_label"
                className="admin-package-label"
                defaultValue={product?.shared_label ?? "Shared"}
                placeholder="Shared"
                aria-label="Shared tier label"
              />
            </div>
            <label className="admin-label" htmlFor="price">Price (USD)</label>
            <div className="admin-input-prefix">
              <span>$</span>
              <input id="price" name="price" type="number" min="0" step="0.01" required defaultValue={product?.price ?? ""} placeholder="19" />
            </div>
            <label className="admin-label" htmlFor="description" style={{ marginTop: 12 }}>Description / what&rsquo;s included</label>
            <textarea
              id="description"
              name="description"
              className="admin-textarea"
              defaultValue={product?.description ?? ""}
              placeholder="Shared account login. Best for solo users."
              rows={4}
            />
          </div>

          {/* Private tier (optional, uses new private_* columns) */}
          <div className="admin-package-card admin-package-card-alt">
            <div className="admin-package-card-head">
              <i className="fa-solid fa-shield-halved"></i>
              <input
                type="text"
                name="private_label"
                className="admin-package-label"
                defaultValue={product?.private_label ?? "Private"}
                placeholder="Private"
                aria-label="Private tier label"
              />
            </div>
            <label className="admin-label" htmlFor="private_price">Price (USD) — optional</label>
            <div className="admin-input-prefix">
              <span>$</span>
              <input
                id="private_price"
                name="private_price"
                type="number"
                min="0"
                step="0.01"
                defaultValue={product?.private_price ?? ""}
                placeholder="49"
              />
            </div>
            <label className="admin-label" htmlFor="private_description" style={{ marginTop: 12 }}>Description / what&rsquo;s included</label>
            <textarea
              id="private_description"
              name="private_description"
              className="admin-textarea"
              defaultValue={product?.private_description ?? ""}
              placeholder="Dedicated account, only you have access. Replacement guarantee for full period."
              rows={4}
            />
            <p className="admin-help">Leave price empty / 0 to hide the Private tier.</p>
          </div>
        </div>
      </section>

      {/* STEP 2 — DETAILS: Features (bullet lines under the price) */}
      <section className="admin-card" hidden={step !== 1}>
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

      {/* STEP 3 — PUBLISH: Visibility */}
      <section className="admin-card" hidden={step !== 2}>
        <header className="admin-section-head">
          <h3>Visibility</h3>
          <p>Where this product shows up and in what order.</p>
        </header>

        <div className="admin-row cols-2">
          <div>
            <label className="admin-label" htmlFor="sort_order">Sort order</label>
            <input id="sort_order" name="sort_order" type="number" step="1" className="admin-input" defaultValue={product?.sort_order ?? 0} />
            <p className="admin-help">Lower numbers appear first on the shop page.</p>
          </div>
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

      {/* STEP 3 — PUBLISH: Related products (admin-curated) */}
      <section className="admin-card" hidden={step !== 2}>
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

      {/* STEP 3 — PUBLISH: Reviews (per-product) */}
      <section className="admin-card" hidden={step !== 2}>
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
                {isEdit ? "Saving…" : "Creating…"}
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
