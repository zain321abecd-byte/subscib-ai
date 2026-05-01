"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type Currency = "PKR" | "USD";
export type CurrencyMode = "auto" | "always_pkr" | "always_usd" | "dual";

type FxState = {
  /** Live (or admin-overridden) FX rate. */
  usdToPkr: number;
  /** Whether the FX rate has loaded from the API yet. */
  ready: boolean;
  /** Active currency for THIS user (after resolving mode + region + cookie). */
  currency: Currency;
  /** Admin-configured display mode. */
  mode: CurrencyMode;
  /** Switch the active currency (writes a cookie so it persists). */
  setCurrency: (c: Currency) => void;
};

const FxCtx = createContext<FxState>({
  usdToPkr: 280,
  ready: false,
  currency: "USD",
  mode: "auto",
  setCurrency: () => {},
});

function setCookie(name: string, value: string, days = 365) {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Lax`;
}

export function FxProvider({
  children,
  initialCurrency,
  mode,
  fxOverride,
}: {
  children: ReactNode;
  /** Resolved on the server in the layout, used as the initial value. */
  initialCurrency: Currency;
  /** Admin-configured currency mode. */
  mode: CurrencyMode;
  /** Optional manual FX rate from admin settings (0/undefined → use live API). */
  fxOverride?: number;
}) {
  const [usdToPkr, setUsdToPkr] = useState(fxOverride && fxOverride > 0 ? fxOverride : 280);
  const [ready, setReady] = useState(!!fxOverride && fxOverride > 0);
  const [currency, setCurrencyState] = useState<Currency>(initialCurrency);

  useEffect(() => {
    if (fxOverride && fxOverride > 0) {
      setUsdToPkr(fxOverride);
      setReady(true);
      return;
    }
    let cancelled = false;
    fetch("/api/fx-rate")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (Number.isFinite(d?.usdToPkr)) setUsdToPkr(d.usdToPkr);
        setReady(true);
      })
      .catch(() => setReady(true));
    return () => {
      cancelled = true;
    };
  }, [fxOverride]);

  function setCurrency(c: Currency) {
    setCurrencyState(c);
    setCookie("currency", c);
  }

  return (
    <FxCtx.Provider value={{ usdToPkr, ready, currency, mode, setCurrency }}>
      {children}
    </FxCtx.Provider>
  );
}

export function useFx() {
  return useContext(FxCtx);
}

function formatPKR(n: number) {
  return `Rs ${Math.round(n).toLocaleString("en-PK")}`;
}

function formatUSD(n: number) {
  return `$${Number(n).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

/**
 * Render a price in the visitor's currency. Behaviour by mode:
 *   - "auto"        — show ONE currency (PKR for PK visitors, USD otherwise),
 *                     unless the user manually flipped via the switcher.
 *   - "always_pkr"  — show PKR primary with a small USD note.
 *   - "always_usd"  — show USD only.
 *   - "dual"        — show both (USD primary, PKR secondary).
 */
export function Price({ usd, large = false }: { usd: number; large?: boolean }) {
  const { usdToPkr, ready, currency, mode } = useFx();
  const pkr = Math.round(usd * usdToPkr);

  const primaryStyle: React.CSSProperties = {
    fontFamily: "var(--font-heading)",
    fontSize: large ? "var(--fs-3xl)" : undefined,
    color: "var(--text)",
  };
  const secondaryStyle: React.CSSProperties = {
    color: "var(--text-muted)",
    fontSize: "var(--fs-xs)",
  };

  if (mode === "dual") {
    return (
      <span style={{ display: "inline-flex", alignItems: "baseline", gap: 8 }}>
        <strong style={primaryStyle}>{formatUSD(usd)}</strong>
        {ready && <small style={secondaryStyle}>≈ {formatPKR(pkr)}</small>}
      </span>
    );
  }
  if (mode === "always_pkr") {
    return (
      <span style={{ display: "inline-flex", alignItems: "baseline", gap: 8 }}>
        <strong style={primaryStyle}>{ready ? formatPKR(pkr) : "—"}</strong>
        <small style={secondaryStyle}>≈ {formatUSD(usd)}</small>
      </span>
    );
  }
  if (mode === "always_usd") {
    return <strong style={primaryStyle}>{formatUSD(usd)}</strong>;
  }

  // mode === "auto" — show only the user's resolved currency.
  if (currency === "PKR") {
    return <strong style={primaryStyle}>{ready ? formatPKR(pkr) : "—"}</strong>;
  }
  return <strong style={primaryStyle}>{formatUSD(usd)}</strong>;
}
