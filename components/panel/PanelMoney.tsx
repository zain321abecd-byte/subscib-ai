"use client";

import { formatPriceFromPKR, useFx } from "@/lib/fx";

/**
 * Displays a canonical PKR ledger amount in the visitor's regional currency.
 * The database and payment gateway continue to use PKR; only presentation is
 * converted, so historic balances and transaction reconciliation stay exact.
 */
export default function PanelMoney({
  value,
  suffix = "",
}: {
  value: number | null | undefined;
  suffix?: string;
}) {
  const { currency, usdToPkr, usdToInr, ready } = useFx();
  return <>{formatPriceFromPKR(Number(value ?? 0), currency, usdToPkr, ready, usdToInr)}{suffix}</>;
}

export function PanelCurrencyNote() {
  const { currency } = useFx();
  if (currency === "PKR") return null;

  return (
    <p className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--text-muted)]">
      Prices are shown in {currency} for your region using the live exchange rate. Wallet accounting and payment
      settlement remain in PKR.
    </p>
  );
}
