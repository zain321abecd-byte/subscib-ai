import { getSupabaseAdmin, hasServiceRole } from "@/lib/supabase/admin";
import { getSupabaseServer } from "@/lib/supabase/server";
import { createReview, deleteReview, updateReview } from "./actions";
import DeleteSubmit from "./DeleteSubmit";
import SubmitButton from "./SubmitButton";
import StyledSelectField from "../StyledSelectField";
import FloatField from "../FloatField";
import PhotoField from "./PhotoField";
import type { ReviewRow } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

const COLORS = [
  { value: "var(--brand-soft)",   label: "Orange" },
  { value: "var(--accent-soft)",  label: "Pink" },
  { value: "var(--info-soft)",    label: "Blue" },
  { value: "var(--warning-soft)", label: "Amber" },
];

export default async function ReviewsAdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;
  /**
   * Read with the service role so moderators can see unapproved reviews.
   * The RLS policy is `approved = true or is_admin()`, and `is_admin()` reads
   * `auth.uid()` from a Supabase Auth session — which the portal's own JWT
   * cookie never creates. With the anon client this page silently showed only
   * already-approved rows, so anything pending moderation was invisible here.
   */
  const serviceRole = hasServiceRole();
  const supabase = serviceRole ? getSupabaseAdmin() : await getSupabaseServer();
  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  const reviews = (data ?? []) as ReviewRow[];

  /**
   * Pre-fill the new-review Sort order with the next free slot. It was a
   * constant 0, so every review added tied for first place and their real order
   * fell through to the created_at tiebreaker.
   *
   * Taking the max of (highest existing sort_order, row count) is right in both
   * directions: rows still sitting on the old default of 0 get a sensible
   * count-based number (7 existing reviews -> 8), and a gap left by a deleted
   * review can't produce a collision (orders 1,2,3,9 with 4 rows -> 10).
   */
  const nextSortOrder =
    Math.max(
      reviews.reduce((max, r) => Math.max(max, Number(r.sort_order) || 0), 0),
      reviews.length
    ) + 1;

  return (
    <>
      <header className="admin-page-head">
        <div>
          <h1>Customer reviews</h1>
          <p>Manage testimonials shown on the homepage and product pages.</p>
        </div>
      </header>

      {(params.created || params.updated || params.deleted) && (
        <div className="admin-card" style={{ background: "rgba(34,197,94,0.10)", borderColor: "rgba(34,197,94,0.30)", color: "#86efac", marginBottom: 14 }}>
          {params.created && "Review created."}
          {params.updated && "Review updated."}
          {params.deleted && "Review deleted."}
        </div>
      )}

      {/* Write failures redirect here with ?error=... . This banner was missing,
          so a rejected insert looked identical to a successful one: the form
          submitted, the page came back, and no review appeared. */}
      {params.error && (
        <div className="admin-card" style={{ background: "rgba(239,68,68,0.10)", borderColor: "rgba(239,68,68,0.30)", color: "#fca5a5", marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <span><strong>Could not save.</strong> {params.error}</span>
          {/* The message lives in the query string, so it survives reloads and
              back-navigation and can outlive the problem it describes. Give an
              explicit way back to a clean URL. */}
          <a href="/admin/reviews" style={{ color: "#fca5a5", textDecoration: "underline", whiteSpace: "nowrap", flexShrink: 0 }}>
            Dismiss
          </a>
        </div>
      )}

      {!serviceRole && (
        <div className="admin-card" style={{ background: "rgba(245,158,11,0.10)", borderColor: "rgba(245,158,11,0.30)", color: "#fcd34d", marginBottom: 14 }}>
          <strong>SUPABASE_SERVICE_ROLE_KEY is not set.</strong> Row-level security
          will reject new reviews, and any review awaiting approval is hidden from
          this list. Add the key in Vercel → Settings → Environment Variables
          (Production) and redeploy.
        </div>
      )}

      {error && (
        <div className="admin-card" style={{ background: "rgba(239,68,68,0.10)", borderColor: "rgba(239,68,68,0.30)", color: "#fca5a5", marginBottom: 14 }}>
          {error.message}
        </div>
      )}

      {/* Add new review */}
      <form action={createReview} className="admin-card">
        <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "1rem", color: "var(--text)", margin: "0 0 12px" }}>Add review</h3>
        <PhotoField />
        <div className="admin-row cols-3">
          <FloatField name="name" label="Name" icon="fa-user" required />
          <FloatField name="initials" label="Initials" icon="fa-user-tag" required maxLength={4} />
          <div className="admin-float-field admin-float-field-select">
            <StyledSelectField name="color" defaultValue="var(--brand-soft)" options={COLORS} ariaLabel="Avatar colour" />
            <span className="admin-float-label admin-float-label-pinned">Avatar colour</span>
          </div>
        </div>
        <div className="admin-row cols-3">
          <FloatField name="rating" type="number" min={1} max={5} label="Rating (1–5)" icon="fa-star" defaultValue={5} />
          <FloatField name="product_name" label="Product (optional)" icon="fa-box" />
          <FloatField
            name="sort_order"
            type="number"
            label="Sort order"
            icon="fa-arrow-down-1-9"
            defaultValue={nextSortOrder}
            hint={reviews.length ? `Next slot after ${reviews.length} existing ${reviews.length === 1 ? "review" : "reviews"}` : "First review"}
          />
        </div>
        <FloatField as="textarea" name="text" label="Review text" icon="fa-quote-left" required />
        <div className="admin-row cols-2">
          <label className="admin-checkbox-row">
            <input type="checkbox" name="approved" defaultChecked />
            Approved (visible on the site)
          </label>
        </div>
        <div className="admin-form-actions">
          <SubmitButton label="Add review" pendingLabel="Adding…" />
        </div>
      </form>

      {/* Existing reviews */}
      <div style={{ marginTop: 22, display: "grid", gap: 14 }}>
        {reviews.length === 0 ? (
          <div className="admin-card admin-empty">
            <i className="fa-solid fa-star"></i>
            <div>No reviews yet.</div>
          </div>
        ) : reviews.map((r) => (
          <details key={r.id} className="admin-card" style={{ padding: 14 }}>
            <summary style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 12, listStyle: "none" }}>
              {r.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={r.photo_url}
                  alt={r.name}
                  width={36}
                  height={36}
                  style={{ width: 36, height: 36, borderRadius: 999, objectFit: "cover", flexShrink: 0 }}
                />
              ) : (
                <span style={{ background: r.color || "var(--brand-soft)", width: 36, height: 36, borderRadius: 999, display: "grid", placeItems: "center", fontWeight: 700, color: "var(--text)", flexShrink: 0 }}>
                  {r.initials}
                </span>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: "var(--text)" }}>{r.name} <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>· {r.rating}★</span></div>
                <div style={{ fontSize: "0.84rem", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.text}</div>
              </div>
              {!r.approved && <span className="admin-pill admin-pill-pending">Hidden</span>}
              <i className="fa-solid fa-chevron-down" style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}></i>
            </summary>

            <form action={updateReview} className="admin-form" style={{ marginTop: 14 }}>
              <input type="hidden" name="id" value={r.id} />
              <PhotoField defaultValue={r.photo_url ?? ""} />
              <div className="admin-row cols-3">
                <FloatField name="name" label="Name" icon="fa-user" required defaultValue={r.name} />
                <FloatField name="initials" label="Initials" icon="fa-user-tag" required maxLength={4} defaultValue={r.initials} />
                <div className="admin-float-field admin-float-field-select">
                  <StyledSelectField name="color" defaultValue={r.color ?? "var(--brand-soft)"} options={COLORS} ariaLabel="Avatar colour" />
                  <span className="admin-float-label admin-float-label-pinned">Avatar colour</span>
                </div>
              </div>
              <div className="admin-row cols-3">
                <FloatField name="rating" type="number" min={1} max={5} label="Rating" icon="fa-star" defaultValue={r.rating} />
                <FloatField name="product_name" label="Product" icon="fa-box" defaultValue={r.product_name ?? ""} />
                <FloatField name="sort_order" type="number" label="Sort order" icon="fa-arrow-down-1-9" defaultValue={r.sort_order} />
              </div>
              <FloatField as="textarea" name="text" label="Review text" icon="fa-quote-left" required defaultValue={r.text} />
              <label className="admin-checkbox-row">
                <input type="checkbox" name="approved" defaultChecked={r.approved} />
                Approved (visible on the site)
              </label>
              <div className="admin-form-actions">
                <SubmitButton label="Save" pendingLabel="Saving…" />
              </div>
            </form>

            <form action={deleteReview} style={{ marginTop: 10 }}>
              <input type="hidden" name="id" value={r.id} />
              <DeleteSubmit />
            </form>
          </details>
        ))}
      </div>
    </>
  );
}

