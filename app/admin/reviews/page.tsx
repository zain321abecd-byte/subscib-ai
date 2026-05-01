import { getSupabaseServer } from "@/lib/supabase/server";
import { createReview, deleteReview, updateReview } from "./actions";
import DeleteSubmit from "./DeleteSubmit";
import StyledSelectField from "../StyledSelectField";
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
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  const reviews = (data ?? []) as ReviewRow[];

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

      {error && (
        <div className="admin-card" style={{ background: "rgba(239,68,68,0.10)", borderColor: "rgba(239,68,68,0.30)", color: "#fca5a5", marginBottom: 14 }}>
          {error.message}
        </div>
      )}

      {/* Add new review */}
      <form action={createReview} className="admin-card">
        <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "1rem", color: "var(--text)", margin: "0 0 12px" }}>Add review</h3>
        <div className="admin-row cols-3">
          <div>
            <label className="admin-label">Name</label>
            <input name="name" required className="admin-input" placeholder="Sara H." />
          </div>
          <div>
            <label className="admin-label">Initials</label>
            <input name="initials" required maxLength={4} className="admin-input" placeholder="SH" />
          </div>
          <div>
            <label className="admin-label">Avatar colour</label>
            <StyledSelectField name="color" defaultValue="var(--brand-soft)" options={COLORS} ariaLabel="Avatar colour" />
          </div>
        </div>
        <div className="admin-row cols-3">
          <div>
            <label className="admin-label">Rating (1–5)</label>
            <input name="rating" type="number" min={1} max={5} defaultValue={5} className="admin-input" />
          </div>
          <div>
            <label className="admin-label">Product (optional)</label>
            <input name="product_name" className="admin-input" placeholder="ChatGPT Plus Plan" />
          </div>
          <div>
            <label className="admin-label">Sort order</label>
            <input name="sort_order" type="number" defaultValue={0} className="admin-input" />
          </div>
        </div>
        <div>
          <label className="admin-label">Review text</label>
          <textarea name="text" required className="admin-textarea" placeholder="What the customer said." />
        </div>
        <div className="admin-row cols-2">
          <label className="admin-checkbox-row">
            <input type="checkbox" name="approved" defaultChecked />
            Approved (visible on the site)
          </label>
        </div>
        <div className="admin-form-actions">
          <button type="submit" className="admin-btn admin-btn-primary">Add review</button>
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
              <span style={{ background: r.color || "var(--brand-soft)", width: 36, height: 36, borderRadius: 999, display: "grid", placeItems: "center", fontWeight: 700, color: "var(--text)", flexShrink: 0 }}>
                {r.initials}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: "var(--text)" }}>{r.name} <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>· {r.rating}★</span></div>
                <div style={{ fontSize: "0.84rem", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.text}</div>
              </div>
              {!r.approved && <span className="admin-pill admin-pill-pending">Hidden</span>}
              <i className="fa-solid fa-chevron-down" style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}></i>
            </summary>

            <form action={updateReview} className="admin-form" style={{ marginTop: 14 }}>
              <input type="hidden" name="id" value={r.id} />
              <div className="admin-row cols-3">
                <div>
                  <label className="admin-label">Name</label>
                  <input name="name" required className="admin-input" defaultValue={r.name} />
                </div>
                <div>
                  <label className="admin-label">Initials</label>
                  <input name="initials" required maxLength={4} className="admin-input" defaultValue={r.initials} />
                </div>
                <div>
                  <label className="admin-label">Avatar colour</label>
                  <StyledSelectField name="color" defaultValue={r.color ?? "var(--brand-soft)"} options={COLORS} ariaLabel="Avatar colour" />
                </div>
              </div>
              <div className="admin-row cols-3">
                <div>
                  <label className="admin-label">Rating</label>
                  <input name="rating" type="number" min={1} max={5} className="admin-input" defaultValue={r.rating} />
                </div>
                <div>
                  <label className="admin-label">Product</label>
                  <input name="product_name" className="admin-input" defaultValue={r.product_name ?? ""} />
                </div>
                <div>
                  <label className="admin-label">Sort order</label>
                  <input name="sort_order" type="number" className="admin-input" defaultValue={r.sort_order} />
                </div>
              </div>
              <div>
                <label className="admin-label">Review text</label>
                <textarea name="text" required className="admin-textarea" defaultValue={r.text} />
              </div>
              <label className="admin-checkbox-row">
                <input type="checkbox" name="approved" defaultChecked={r.approved} />
                Approved (visible on the site)
              </label>
              <div className="admin-form-actions">
                <button type="submit" className="admin-btn admin-btn-primary">Save</button>
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

