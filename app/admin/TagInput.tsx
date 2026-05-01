"use client";

import { useState, useRef, type KeyboardEvent } from "react";

// Comma- or Enter-separated chip input.
// - Type text, press comma OR Enter → text becomes a chip
// - Press Backspace on empty input → removes the last chip
// - Click × on a chip to remove it
// - All chips submit as a single comma-separated string under `name`.
//
// Optional `suggestions` shows a list of predefined chips below the input that
// can be clicked to add them.
export default function TagInput({
  name,
  defaultValue = "",
  placeholder = "Type and press comma…",
  suggestions = [],
  maxTags,
  ariaLabel,
}: {
  name: string;
  defaultValue?: string;
  placeholder?: string;
  suggestions?: string[];
  /** Optional cap on number of chips (e.g. maxTags={1} for single tag). */
  maxTags?: number;
  ariaLabel?: string;
}) {
  const initial = defaultValue
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const [tags, setTags] = useState<string[]>(maxTags ? initial.slice(0, maxTags) : initial);
  const [draft, setDraft] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const atLimit = maxTags != null && tags.length >= maxTags;

  function addTag(raw: string) {
    const v = raw.trim();
    if (!v) return;
    if (atLimit) return;
    if (tags.some((t) => t.toLowerCase() === v.toLowerCase())) return;
    setTags((curr) => [...curr, v]);
  }

  function removeAt(i: number) {
    setTags((curr) => curr.filter((_, idx) => idx !== i));
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "," || e.key === "Enter") {
      e.preventDefault();
      addTag(draft);
      setDraft("");
    } else if (e.key === "Backspace" && draft === "" && tags.length > 0) {
      e.preventDefault();
      removeAt(tags.length - 1);
    }
  }

  function commitDraft() {
    if (draft.trim()) {
      addTag(draft);
      setDraft("");
    }
  }

  const remainingSuggestions = suggestions.filter(
    (s) => !tags.some((t) => t.toLowerCase() === s.toLowerCase()),
  );

  return (
    <>
      <div
        className={`admin-tag-input ${focused ? "is-focused" : ""}`}
        onClick={() => inputRef.current?.focus()}
      >
        {tags.map((tag, i) => (
          <span key={`${tag}-${i}`} className="admin-tag-chip">
            {tag}
            <button
              type="button"
              className="admin-tag-chip-remove"
              onClick={(e) => {
                e.stopPropagation();
                removeAt(i);
              }}
              aria-label={`Remove ${tag}`}
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </span>
        ))}
        {!atLimit && (
          <input
            ref={inputRef}
            className="admin-tag-input-field"
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            onBlur={() => {
              commitDraft();
              setFocused(false);
            }}
            onFocus={() => setFocused(true)}
            placeholder={tags.length === 0 ? placeholder : ""}
            aria-label={ariaLabel}
          />
        )}
      </div>

      {remainingSuggestions.length > 0 && (
        <div className="admin-tag-suggestions">
          {remainingSuggestions.map((s) => (
            <button
              key={s}
              type="button"
              className="admin-tag-suggestion"
              onClick={() => addTag(s)}
            >
              <i className="fa-solid fa-plus"></i> {s}
            </button>
          ))}
        </div>
      )}

      <input type="hidden" name={name} value={tags.join(",")} />
    </>
  );
}
