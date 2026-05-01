"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import ImagePicker from "../ImagePicker";
import MultiImagePicker from "../MultiImagePicker";
import Select from "@/components/Select";
import TagInput from "../TagInput";
import RelatedProductsPicker from "./RelatedProductsPicker";
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

export default function ProductForm({
  product,
  availableProducts = [],
}: {
  product?: ProductRow;
  availableProducts?: AvailableProduct[];
}) {
  const isEdit = !!product;
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string>(product?.image_url ?? "");
  const [gallery, setGallery] = useState<string[]>(Array.isArray(product?.gallery) ? product!.gallery! : []);
  const [category, setCategory] = useState<CategoryValue>((product?.category as CategoryValue) ?? "ai-subscriptions");
  const [mediaClass, setMediaClass] = useState<MediaValue>((product?.media_class as MediaValue) ?? "media-blue");

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

      {error && (
        <div className="admin-card" style={{ background: "rgba(239,68,68,0.10)", borderColor: "rgba(239,68,68,0.30)", color: "#fca5a5" }}>
          {error}
        </div>
      )}

      {/* SECTION 1 — Cover image (now first) */}
      <section className="admin-card">
        <header className="admin-section-head">
          <h3>Cover image</h3>
          <p>This is what shows up on the shop card and the product page.</p>
        </header>

        <ImagePicker value={imageUrl} onChange={setImageUrl} folder="products" />
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

      {/* SECTION 2 — Basics */}
      <section className="admin-card">
        <header className="admin-section-head">
          <h3>Basics</h3>
          <p>Name, description, and how it&rsquo;s priced.</p>
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

          <div>
            <label className="admin-label" htmlFor="description">Description</label>
            <textarea id="description" name="description" className="admin-textarea" defaultValue={product?.description ?? ""} placeholder="One- or two-line pitch shown on the shop card and product page." />
          </div>

          <div className="admin-row cols-2">
            <div>
              <label className="admin-label" htmlFor="price">Price (USD)</label>
              <div className="admin-input-prefix">
                <span>$</span>
                <input id="price" name="price" type="number" min="0" step="0.01" required defaultValue={product?.price ?? ""} placeholder="19" />
              </div>
            </div>
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
            <p className="admin-help">Press <kbd>,</kbd> or <kbd>Enter</kbd> after each tag. Backspace on empty input removes the last one.</p>
          </div>
        </div>
      </section>

      {/* SECTION 3 — Visibility */}
      <section className="admin-card">
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

      {/* SECTION 4 — Related products (admin-curated) */}
      <section className="admin-card">
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

      <div className="admin-form-actions admin-form-actions-sticky">
        <Link href="/admin/products" className="admin-btn admin-btn-ghost">Cancel</Link>
        <button type="submit" className="admin-btn admin-btn-primary" disabled={isPending}>
          {isPending ? (
            <>
              <span className="admin-spinner" />
              {isEdit ? "Saving…" : "Creating…"}
            </>
          ) : (
            isEdit ? "Save changes" : "Create product"
          )}
        </button>
      </div>
    </form>
  );
}
