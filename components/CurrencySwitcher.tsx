"use client";

import { useEffect, useRef, useState } from "react";
import { useFx, type Currency } from "@/lib/fx";

const CURRENCIES: Array<{ code: Currency; label: string }> = [
  { code: "USD", label: "US Dollar" },
  { code: "PKR", label: "Pakistan Rupee" },
  { code: "INR", label: "Indian Rupee" },
];

export default function CurrencySwitcher() {
  const { currency, setCurrency } = useFx();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={ref} className="currency-switcher">
      <button
        type="button"
        className="currency-switcher-trigger"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Currency: ${currency}`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <i className="fa-solid fa-coins"></i>
        <span>{currency}</span>
        <i className={`fa-solid fa-chevron-down currency-switcher-chev ${open ? "is-open" : ""}`}></i>
      </button>
      {open && (
        <ul className="currency-switcher-menu" role="listbox">
          {CURRENCIES.map((c) => (
            <li
              key={c.code}
              role="option"
              aria-selected={currency === c.code}
              className={`currency-switcher-option ${currency === c.code ? "is-selected" : ""}`}
              onClick={() => {
                setCurrency(c.code);
                setOpen(false);
              }}
            >
              <span>{c.code}</span>
              <small>{c.label}</small>
              {currency === c.code && <i className="fa-solid fa-check"></i>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
