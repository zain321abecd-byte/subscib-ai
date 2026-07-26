"use client";

import { useState } from "react";

export type ReviewDraft = {
  id?: string;
  name: string;
  initials: string;
  color: string;
  rating: number;
  text: string;
  approved: boolean;
};

const COLORS = [
  { value: "var(--brand-soft)",   label: "Orange", swatch: "linear-gradient(135deg, #8FB4FF, #4884FF)" },
  { value: "var(--accent-soft)",  label: "Pink",   swatch: "linear-gradient(135deg, #ff8db8, #d6336c)" },
  { value: "var(--info-soft)",    label: "Blue",   swatch: "linear-gradient(135deg, #6dc1ff, #3a7bd5)" },
  { value: "var(--warning-soft)", label: "Amber",  swatch: "linear-gradient(135deg, #F8B055, #F59622)" },
];

function emptyReview(): ReviewDraft {
  return { name: "", initials: "", color: "var(--brand-soft)", rating: 5, text: "", approved: true };
}

// Inline reviews editor, scoped to the current product. The form encodes the
// final list as JSON in a hidden input named by `name`. The server action
// diffs this against existing rows and inserts/updates/deletes accordingly.
export default function ProductReviewsInput({
  name,
  defaultValue = [],
}: {
  name: string;
  defaultValue?: ReviewDraft[];
}) {
  const [reviews, setReviews] = useState<ReviewDraft[]>(defaultValue);

  function update(i: number, patch: Partial<ReviewDraft>) {
    setReviews((curr) => curr.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function add() {
    setReviews((curr) => [...curr, emptyReview()]);
  }
  function remove(i: number) {
    setReviews((curr) => curr.filter((_, idx) => idx !== i));
  }

  // Strip empties before submit so the action doesn't insert blank rows.
  const cleaned = reviews
    .map((r) => ({ ...r, name: r.name.trim(), initials: r.initials.trim().slice(0, 4), text: r.text.trim() }))
    .filter((r) => r.name && r.text);

  return (
    <div className="admin-product-reviews">
      {reviews.length === 0 ? (
        <div className="admin-empty" style={{ padding: 18 }}>
          <i className="fa-solid fa-star"></i>
          <div>No reviews yet for this product.</div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {reviews.map((r, i) => (
            <div key={i} className="admin-review-row">
              <div className="admin-review-row-head">
                <span
                  className="admin-review-avatar"
                  style={{ background: r.color || "var(--brand-soft)" }}
                  aria-hidden
                >
                  {r.initials || "?"}
                </span>
                <input
                  type="text"
                  className="admin-input"
                  placeholder="Customer name (e.g. Sara H.)"
                  value={r.name}
                  onChange={(e) => update(i, { name: e.target.value })}
                />
                <button
                  type="button"
                  className="admin-feature-remove"
                  onClick={() => remove(i)}
                  aria-label="Delete review"
                >
                  <i className="fa-solid fa-trash"></i>
                </button>
              </div>

              <div className="admin-row cols-3">
                <div>
                  <label className="admin-label">Initials</label>
                  <input
                    type="text"
                    maxLength={4}
                    className="admin-input"
                    value={r.initials}
                    onChange={(e) => update(i, { initials: e.target.value.toUpperCase() })}
                    placeholder="SH"
                  />
                </div>
                <div>
                  <label className="admin-label">Rating</label>
                  <div className="admin-rating">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => update(i, { rating: n })}
                        className={`admin-star ${n <= r.rating ? "is-on" : ""}`}
                        aria-label={`${n} stars`}
                      >
                        <i className="fa-solid fa-star"></i>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="admin-label">Avatar colour</label>
                  <div className="admin-swatch-row" role="radiogroup">
                    {COLORS.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        role="radio"
                        aria-checked={r.color === c.value}
                        className={`admin-swatch ${r.color === c.value ? "is-active" : ""}`}
                        onClick={() => update(i, { color: c.value })}
                        title={c.label}
                        style={{ background: c.swatch, width: 30, height: 30 }}
                      >
                        {r.color === c.value && <i className="fa-solid fa-check" style={{ fontSize: 9 }}></i>}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="admin-label">Review text</label>
                <textarea
                  className="admin-textarea"
                  rows={3}
                  placeholder="Ordered ChatGPT Plus on a Sunday night, paid with JazzCash, login arrived in 12 minutes…"
                  value={r.text}
                  onChange={(e) => update(i, { text: e.target.value })}
                />
              </div>

              <label className="admin-checkbox-row" style={{ marginTop: 4 }}>
                <input
                  type="checkbox"
                  checked={r.approved}
                  onChange={(e) => update(i, { approved: e.target.checked })}
                />
                Approved (visible on the site)
              </label>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        className="admin-btn admin-btn-ghost"
        onClick={add}
        style={{ marginTop: 12 }}
      >
        <i className="fa-solid fa-plus"></i> Add review
      </button>

      <input type="hidden" name={name} value={JSON.stringify(cleaned)} />
    </div>
  );
}
