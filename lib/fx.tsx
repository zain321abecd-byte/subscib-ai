"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type Currency = "PKR" | "USD" | "INR";
export type CurrencyMode = "auto" | "always_pkr" | "always_usd" | "dual";
export type Region = "PK" | "IN" | "OTHER";

type FxState = {
  /** Live or admin-overridden USD to PKR rate. */
  usdToPkr: number;
  /** Live USD to INR rate, used for Indian previews. */
  usdToInr: number;
  /** Whether FX rates have loaded from the API yet. */
  ready: boolean;
  /** Active currency for this user after geo default + cookie override. */
  currency: Currency;
  /** Admin-configured display mode, retained for settings compatibility. */
  mode: CurrencyMode;
  /** Detected geo region for copy and payment-method visibility. */
  region: Region;
  /** Switch the active currency and persist it. */
  setCurrency: (c: Currency) => void;
};

const FxCtx = createContext<FxState>({
  usdToPkr: 280,
  usdToInr: 83,
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
  initialCurrency: Currency;
  mode: CurrencyMode;
  fxOverride?: number;
  region?: Region;
}) {
  const [usdToPkr, setUsdToPkr] = useState(fxOverride && fxOverride > 0 ? fxOverride : 280);
  const [usdToInr, setUsdToInr] = useState(83);
  // Fallback rates (280 PKR/USD, 83 INR/USD) are always present, so ready is
  // always true from the start. The API call below refreshes to live rates.
  const [ready, setReady] = useState(true);
  const [currency, setCurrencyState] = useState<Currency>(initialCurrency);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/fx-rate")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (!(fxOverride && fxOverride > 0) && Number.isFinite(d?.usdToPkr)) {
          setUsdToPkr(d.usdToPkr);
        }
        if (Number.isFinite(d?.usdToInr)) setUsdToInr(d.usdToInr);
        setReady(true);
      })
      .catch(() => {});

    if (fxOverride && fxOverride > 0) {
      setUsdToPkr(fxOverride);
    }

    return () => {
      cancelled = true;
    };
  }, [fxOverride]);

  function setCurrency(c: Currency) {
    setCurrencyState(c);
    setCookie("currency", c);
  }

  return (
    <FxCtx.Provider value={{ usdToPkr, usdToInr, ready, currency, mode, region, setCurrency }}>
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

export function formatINR(n: number) {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export function formatPriceFromPKR(
  pkr: number,
  currency: Currency,
  usdToPkr: number,
  ready: boolean,
  usdToInr = 83,
): string {
  if (currency === "PKR") return formatPKR(pkr);
  if (!ready || !usdToPkr) return "-";
  const usd = pkr / usdToPkr;
  if (currency === "INR") return formatINR(usd * usdToInr);
  return formatUSD(usd);
}

/**
 * Render a canonical PKR amount in the currently selected currency. Only one
 * currency module is shown at a time; geo picks the initial currency and the
 * switcher can override it immediately on the client.
 */
export function Price({ pkr, large = false }: { pkr: number; large?: boolean }) {
  const { usdToPkr, usdToInr, ready, currency } = useFx();
  const usd = ready && usdToPkr ? pkr / usdToPkr : 0;

  const primaryStyle: React.CSSProperties = {
    fontFamily: "var(--font-heading)",
    fontSize: large ? "var(--fs-3xl)" : undefined,
    color: "var(--text)",
  };

  if (currency === "PKR") return <strong style={primaryStyle}>{formatPKR(pkr)}</strong>;
  if (!ready || !usdToPkr) return <strong style={primaryStyle}>-</strong>;
  if (currency === "INR") return <strong style={primaryStyle}>{formatINR(usd * usdToInr)}</strong>;
  return <strong style={primaryStyle}>{formatUSD(usd)}</strong>;
}
