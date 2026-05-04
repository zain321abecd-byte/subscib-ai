"use client";

import { useEffect, useRef, useState } from "react";
import { useFx } from "@/lib/fx";

function setRegionCookie(value: "PK" | "OTHER") {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + 365 * 86400_000).toUTCString();
  document.cookie = `region=${value}; expires=${expires}; path=/; SameSite=Lax`;
}

// Compact USD ↔ PKR toggle. Hidden when the admin's `currency_mode` forces a
// single currency (always_pkr / always_usd / dual) — only "auto" mode lets the
// user override their region default.
export default function CurrencySwitcher() {
  const { currency, mode, setCurrency } = useFx();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (mode !== "auto") return null;

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
          {(["PKR", "USD"] as const).map((c) => (
            <li
              key={c}
              role="option"
              aria-selected={currency === c}
              className={`currency-switcher-option ${currency === c ? "is-selected" : ""}`}
              onClick={() => {
                setCurrency(c);
                // Picking PKR also flips the region to PK (so payment methods
                // like JazzCash/Easypaisa show); picking USD flips to OTHER
                // (only Card visible). This keeps copy + payments in sync with
                // what the user actually wants to see.
                setRegionCookie(c === "PKR" ? "PK" : "OTHER");
                setOpen(false);
                // Hard reload so server-rendered region/currency take effect.
                if (typeof window !== "undefined") {
                  window.location.reload();
                }
              }}
            >
              <span>{c}</span>
              {c === "PKR" ? <small>Pakistan Rupee</small> : <small>US Dollar</small>}
              {currency === c && <i className="fa-solid fa-check"></i>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
