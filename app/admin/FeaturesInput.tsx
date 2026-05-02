"use client";

import { useState } from "react";

// Editable list of bullet lines. Each row has a check icon, a text input, and
// a remove button. New rows are added via "+ Add". Submits as a JSON-encoded
// string array on the hidden input named by the `name` prop.
export default function FeaturesInput({
  name,
  defaultValue = [],
  placeholder = "Activated within 30 minutes",
  max = 12,
}: {
  name: string;
  defaultValue?: string[];
  placeholder?: string;
  max?: number;
}) {
  const [features, setFeatures] = useState<string[]>(defaultValue.length > 0 ? defaultValue : [""]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  function update(i: number, v: string) {
    setFeatures((curr) => curr.map((x, idx) => (idx === i ? v : x)));
  }
  function remove(i: number) {
    setFeatures((curr) => (curr.length === 1 ? [""] : curr.filter((_, idx) => idx !== i)));
  }
  function add() {
    if (features.length >= max) return;
    setFeatures((curr) => [...curr, ""]);
  }
  function move(from: number, to: number) {
    if (from === to) return;
    setFeatures((curr) => {
      const next = curr.slice();
      const [it] = next.splice(from, 1);
      next.splice(to, 0, it);
      return next;
    });
  }

  const cleaned = features.map((s) => s.trim()).filter(Boolean);

  return (
    <div className="admin-features-input">
      <ul className="admin-features-list">
        {features.map((value, i) => (
          <li
            key={i}
            className="admin-feature-row"
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
            <span className="admin-feature-handle" aria-hidden>
              <i className="fa-solid fa-grip-vertical"></i>
            </span>
            <span className="admin-feature-check" aria-hidden>
              <i className="fa-solid fa-check"></i>
            </span>
            <input
              type="text"
              className="admin-feature-input"
              value={value}
              onChange={(e) => update(i, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  add();
                }
              }}
              placeholder={placeholder}
              aria-label={`Feature ${i + 1}`}
            />
            <button
              type="button"
              className="admin-feature-remove"
              onClick={() => remove(i)}
              aria-label={`Remove feature ${i + 1}`}
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </li>
        ))}
      </ul>

      <button
        type="button"
        className="admin-btn admin-btn-ghost"
        onClick={add}
        disabled={features.length >= max}
        style={{ marginTop: 10 }}
      >
        <i className="fa-solid fa-plus"></i> Add line
      </button>

      <input type="hidden" name={name} value={JSON.stringify(cleaned)} />
    </div>
  );
}
