"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

const FxCtx = createContext<{ usdToPkr: number; ready: boolean }>({ usdToPkr: 280, ready: false });

export function FxProvider({ children }: { children: ReactNode }) {
  const [usdToPkr, setUsdToPkr] = useState(280);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/fx-rate")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (Number.isFinite(d?.usdToPkr)) setUsdToPkr(d.usdToPkr);
        setReady(true);
      })
      .catch(() => setReady(true));
    return () => { cancelled = true; };
  }, []);

  return <FxCtx.Provider value={{ usdToPkr, ready }}>{children}</FxCtx.Provider>;
}

export function useFx() {
  return useContext(FxCtx);
}

/** Render USD price with PKR equivalent next to it once the rate is loaded. */
export function Price({ usd, large = false }: { usd: number; large?: boolean }) {
  const { usdToPkr, ready } = useFx();
  const pkr = Math.round(usd * usdToPkr);
  return (
    <span style={{ display: "inline-flex", alignItems: "baseline", gap: 8 }}>
      <strong style={{ fontFamily: "var(--font-heading)", fontSize: large ? "var(--fs-3xl)" : undefined, color: "var(--text)" }}>${usd}</strong>
      {ready && <small style={{ color: "var(--text-muted)", fontSize: "var(--fs-xs)" }}>≈ Rs {pkr.toLocaleString("en-PK")}</small>}
    </span>
  );
}
