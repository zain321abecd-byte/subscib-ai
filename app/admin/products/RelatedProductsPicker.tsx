"use client";

import { useMemo, useState } from "react";

type Item = { id: string; name: string; category: string; image_url?: string | null };

// Multi-select picker with search + selected chips reorderable via drag.
// Submits the selected ids as a JSON-encoded string in a hidden input.
export default function RelatedProductsPicker({
  available,
  defaultSelected = [],
  excludeId,
  max = 8,
}: {
  /** All products the admin can choose from. */
  available: Item[];
  /** Initial selection (preserves order). */
  defaultSelected?: string[];
  /** Optional id to exclude (the product currently being edited). */
  excludeId?: string;
  /** Hard cap. */
  max?: number;
}) {
  const pool = useMemo(
    () => available.filter((p) => p.id !== excludeId),
    [available, excludeId],
  );
  const byId = useMemo(() => Object.fromEntries(pool.map((p) => [p.id, p])), [pool]);

  const [selected, setSelected] = useState<string[]>(
    defaultSelected.filter((id) => byId[id]),
  );
  const [search, setSearch] = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return pool;
    return pool.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q),
    );
  }, [pool, search]);

  function toggle(id: string) {
    setSelected((curr) => {
      if (curr.includes(id)) return curr.filter((x) => x !== id);
      if (curr.length >= max) return curr;
      return [...curr, id];
    });
  }

  function removeAt(i: number) {
    setSelected((curr) => curr.filter((_, idx) => idx !== i));
  }

  function move(from: number, to: number) {
    if (from === to) return;
    setSelected((curr) => {
      const next = curr.slice();
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }

  return (
    <div className="admin-related-picker">
      {/* Selected chips (drag to reorder) */}
      {selected.length > 0 && (
        <div className="admin-related-selected">
          {selected.map((id, i) => {
            const item = byId[id];
            if (!item) return null;
            return (
              <div
                key={id}
                className="admin-related-chip"
                draggable
                onDragStart={() => setDragIndex(i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragIndex != null) move(dragIndex, i);
                  setDragIndex(null);
                }}
                onDragEnd={() => setDragIndex(null)}
              >
                {item.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image_url} alt="" />
                ) : (
                  <span className="admin-related-chip-placeholder"><i className="fa-solid fa-cube"></i></span>
                )}
                <span className="admin-related-chip-name">{item.name}</span>
                <button
                  type="button"
                  className="admin-related-chip-remove"
                  onClick={() => removeAt(i)}
                  aria-label={`Remove ${item.name}`}
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Search */}
      <div className="admin-related-search">
        <i className="fa-solid fa-magnifying-glass"></i>
        <input
          type="text"
          placeholder="Search products to add…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span className="admin-related-count">
          {selected.length} / {max}
        </span>
      </div>

      {/* Picker list */}
      <ul className="admin-related-list" role="listbox" aria-multiselectable="true">
        {filtered.length === 0 ? (
          <li className="admin-related-empty">No products match.</li>
        ) : (
          filtered.map((p) => {
            const isSelected = selected.includes(p.id);
            const disabled = !isSelected && selected.length >= max;
            return (
              <li key={p.id}>
                <button
                  type="button"
                  className={`admin-related-row ${isSelected ? "is-selected" : ""}`}
                  onClick={() => toggle(p.id)}
                  disabled={disabled}
                  aria-pressed={isSelected}
                >
                  {p.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image_url} alt="" className="admin-related-thumb" />
                  ) : (
                    <span className="admin-related-thumb admin-related-thumb-placeholder">
                      <i className="fa-solid fa-cube"></i>
                    </span>
                  )}
                  <span className="admin-related-row-text">
                    <strong>{p.name}</strong>
                    <small>{p.category}</small>
                  </span>
                  <span className={`admin-related-check ${isSelected ? "is-on" : ""}`}>
                    {isSelected ? <i className="fa-solid fa-check"></i> : <i className="fa-solid fa-plus"></i>}
                  </span>
                </button>
              </li>
            );
          })
        )}
      </ul>

      <p className="admin-help">
        Pick which products show in <strong>You may also like</strong> on this product&rsquo;s page.
        Drag chips above to reorder. Leave empty to fall back to category-based recommendations.
      </p>

      <input type="hidden" name="related_product_ids" value={JSON.stringify(selected)} />
    </div>
  );
}
