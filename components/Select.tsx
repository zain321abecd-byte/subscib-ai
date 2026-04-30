"use client";

import { useEffect, useRef, useState } from "react";

export type SelectOption<T extends string = string> = { value: T; label: string };

export default function Select<T extends string = string>({
  value,
  onChange,
  options,
  placeholder = "Select…",
  ariaLabel,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) { setOpen(true); return; }
      setHighlighted((i) => (i + 1) % options.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((i) => (i - 1 + options.length) % options.length);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (open) {
        onChange(options[highlighted].value);
        setOpen(false);
      } else {
        setOpen(true);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={ref} className={`v2-select ${className || ""}`} onKeyDown={onKeyDown}>
      <button
        type="button"
        className="v2-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((o) => !o)}
      >
        <span>{selected?.label || placeholder}</span>
        <i className={`fa-solid fa-chevron-down v2-select-chev ${open ? "is-open" : ""}`}></i>
      </button>
      {open && (
        <ul className="v2-select-menu" role="listbox">
          {options.map((opt, i) => (
            <li
              key={opt.value}
              role="option"
              aria-selected={opt.value === value}
              className={`v2-select-option ${opt.value === value ? "is-selected" : ""} ${i === highlighted ? "is-highlighted" : ""}`}
              onMouseEnter={() => setHighlighted(i)}
              onClick={() => { onChange(opt.value); setOpen(false); }}
            >
              {opt.label}
              {opt.value === value && <i className="fa-solid fa-check" style={{ color: "var(--brand-500)" }}></i>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
