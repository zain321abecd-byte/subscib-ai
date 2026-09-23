"use client";

import { useState } from "react";
import PayFastForm from "./PayFastForm";
import TopUpForm from "./TopUpForm";

/**
 * Two ways to add funds, one chooser.
 *
 * PayFast is first and default because it credits the wallet immediately;
 * the manual claim still exists for customers who transfer straight to the
 * bank account, but it costs them an admin's attention and a wait.
 */
export default function TopUpMethods({
  currency,
  defaultMobile,
}: {
  currency: string;
  defaultMobile: string;
}) {
  const [method, setMethod] = useState<"payfast" | "manual">("payfast");

  return (
    <div className="grid gap-3">
      <div
        role="tablist"
        aria-label="Payment method"
        className="flex gap-1.5 rounded-lg bg-[var(--surface-3)] p-1"
      >
        <button
          type="button"
          role="tab"
          aria-selected={method === "payfast"}
          onClick={() => setMethod("payfast")}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
            method === "payfast"
              ? "bg-[var(--surface)] text-[var(--text)] shadow-sm"
              : "text-[var(--text-muted)] hover:text-[var(--text)]"
          }`}
        >
          Pay online
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={method === "manual"}
          onClick={() => setMethod("manual")}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
            method === "manual"
              ? "bg-[var(--surface)] text-[var(--text)] shadow-sm"
              : "text-[var(--text-muted)] hover:text-[var(--text)]"
          }`}
        >
          I already transferred
        </button>
      </div>

      {method === "payfast" ? (
        <PayFastForm currency={currency} defaultMobile={defaultMobile} />
      ) : (
        <TopUpForm currency={currency} />
      )}
    </div>
  );
}
