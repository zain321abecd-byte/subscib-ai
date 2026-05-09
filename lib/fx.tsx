"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type Currency = "PKR" | "USD";
export type CurrencyMode = "auto" | "always_pkr" | "always_usd" | "dual";
export type Region = "PK" | "OTHER";

type FxState = {
  /** Live (or admin-overridden) FX rate. */
  usdToPkr: number;
  /** Whether the FX rate has loaded from the API yet. */
  ready: boolean;
  /** Active currency for THIS user (after resolving mode + region + cookie). */
  currency: Currency;
  /** Admin-configured display mode. */
  mode: CurrencyMode;
  /** Detected geo region for the visitor — drives copy + payment options. */
  region: Region;
  /** Switch the active currency (writes a cookie so it persists). */
  setCurrency: (c: Currency) => void;
};

const FxCtx = createContext<FxState>({
  usdToPkr: 280,
  ready: false,
  currency: "USD",
  mode: "auto",
  region: "OTHER",
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
  region = "OTHER",
}: {
  children: ReactNode;
  /** Resolved on the server in the layout, used as the initial value. */
  initialCurrency: Currency;
  /** Admin-configured currency mode. */
  mode: CurrencyMode;
  /** Optional manual FX rate from admin settings (0/undefined → use live API). */
  fxOverride?: number;
  /** Detected region — drives copy + payment-method visibility. */
  region?: Region;
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
    <FxCtx.Provider value={{ usdToPkr, ready, currency, mode, region, setCurrency }}>
      {children}
    </FxCtx.Provider>
  );
}

export function useFx() {
  return useContext(FxCtx);
}

export function formatPKR(n: number) {
  return `Rs ${Math.round(n).toLocaleString("en-PK")}`;
}

export function formatUSD(n: number) {
  return `$${Number(n).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

/**
 * Format a PKR amount for the resolved active currency. If the visitor's
 * active currency is USD, the amount is converted via the live FX rate.
 * Returns "—" while the FX rate is still loading on the client.
 */
export function formatPriceFromPKR(pkr: number, currency: Currency, usdToPkr: number, ready: boolean): string {
  if (currency === "PKR") return formatPKR(pkr);
  // USD requires the FX rate. Show a placeholder until the rate has loaded
  // (avoids flashing a stale 280-default value).
  if (!ready || !usdToPkr) return "—";
  return formatUSD(pkr / usdToPkr);
}

/**
 * Render a price in the visitor's currency. The `pkr` prop is the canonical
 * stored amount (in Rupees) — conversion to USD happens here for foreign
 * visitors. Behaviour by mode:
 *   - "auto"        — show ONE currency (PKR for PK / mode-PKR users, USD
 *                     otherwise), respecting the manual switcher cookie.
 *   - "always_pkr"  — show PKR primary with a small USD note.
 *   - "always_usd"  — show USD only.
 *   - "dual"        — show both (PKR primary, USD secondary).
 */
export function Price({ pkr, large = false }: { pkr: number; large?: boolean }) {
  const { usdToPkr, ready, currency, mode } = useFx();
  const usd = ready && usdToPkr ? pkr / usdToPkr : 0;

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
        <strong style={primaryStyle}>{formatPKR(pkr)}</strong>
        {ready && <small style={secondaryStyle}>≈ {formatUSD(usd)}</small>}
      </span>
    );
  }
  if (mode === "always_pkr") {
    return (
      <span style={{ display: "inline-flex", alignItems: "baseline", gap: 8 }}>
        <strong style={primaryStyle}>{formatPKR(pkr)}</strong>
        {ready && <small style={secondaryStyle}>≈ {formatUSD(usd)}</small>}
      </span>
    );
  }
  if (mode === "always_usd") {
    return <strong style={primaryStyle}>{ready ? formatUSD(usd) : "—"}</strong>;
  }

  // mode === "auto" — show only the user's resolved currency.
  if (currency === "PKR") {
    return <strong style={primaryStyle}>{formatPKR(pkr)}</strong>;
  }
  return <strong style={primaryStyle}>{ready ? formatUSD(usd) : "—"}</strong>;
}
