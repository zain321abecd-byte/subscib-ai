"use client";

import { useEffect, useRef, useState } from "react";
import { startPayFastTopUp, type PayFastHandoff } from "@/lib/panel/actions/payfast";

const PRESETS = [500, 1000, 2500, 5000, 10000];
const MIN = 100;

export default function PayFastForm({
  currency,
  defaultMobile,
}: {
  currency: string;
  defaultMobile: string;
}) {
  const [amount, setAmount] = useState("");
  const [mobile, setMobile] = useState(defaultMobile);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [handoff, setHandoff] = useState<PayFastHandoff | null>(null);
  const [stalled, setStalled] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);

  // Once the gateway hands us the fields, React mounts them as hidden inputs
  // and this submits the form, which navigates the browser to PayFast's hosted
  // checkout. Same handoff the shop checkout uses.
  useEffect(() => {
    if (!handoff || !formRef.current) return;
    formRef.current.submit();
    // If the navigation hasn't happened in a few seconds something blocked it,
    // so surface a button rather than leaving the customer on a dead spinner.
    const timer = setTimeout(() => setStalled(true), 6000);
    return () => clearTimeout(timer);
  }, [handoff]);

  const value = Number(amount);
  const valid = Number.isFinite(value) && value >= MIN && mobile.replace(/\D/g, "").length >= 10;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await startPayFastTopUp({ amount: value, mobile });
    if (!res.ok) {
      setBusy(false);
      setError(res.error);
      return;
    }
    // Deliberately stays busy — the browser is about to leave the page, and
    // re-enabling the button invites a second payment.
    setHandoff(res.data!);
  }

  if (handoff) {
    return (
      <div className="panel-card grid gap-3 p-5 text-center">
        <p className="text-sm font-semibold text-[var(--text)]">Taking you to PayFast…</p>
        <p className="text-sm text-[var(--text-muted)]">
          Paying {Number(handoff.amount).toLocaleString("en-PK", { minimumFractionDigits: 2 })} {currency}.
          Don&apos;t close this tab.
        </p>

        <form ref={formRef} action={handoff.action} method="POST" className={stalled ? "" : "hidden"}>
          {Object.entries(handoff.fields).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={String(v)} />
          ))}
          {stalled && (
            <>
              <p className="mb-3 text-sm text-[var(--text-muted)]">
                The redirect didn&apos;t start on its own. Your top-up is saved — continue to pay:
              </p>
              <button type="submit" className="panel-btn panel-btn-primary">
                Continue to PayFast
              </button>
            </>
          )}
        </form>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="panel-card grid gap-4 p-5">
      <div>
        <label className="panel-label" htmlFor="pf-amount">Amount ({currency})</label>
        <input
          id="pf-amount"
          className="panel-input"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="decimal"
          placeholder="1000"
        />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setAmount(String(p))}
              className="rounded-lg bg-[var(--surface-3)] px-2.5 py-1 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text)]"
            >
              {p.toLocaleString()}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-[var(--text-muted)]">
          Minimum {MIN.toLocaleString()} {currency}.
        </p>
      </div>

      <div>
        <label className="panel-label" htmlFor="pf-mobile">Mobile number</label>
        <input
          id="pf-mobile"
          className="panel-input"
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
          inputMode="tel"
          placeholder="03001234567"
        />
        <p className="mt-1.5 text-xs text-[var(--text-muted)]">
          The number registered with your bank or mobile wallet — PayFast needs it to process the payment.
        </p>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
        >
          {error}
        </p>
      )}

      <button type="submit" className="panel-btn panel-btn-primary" disabled={!valid || busy}>
        {busy ? "Starting…" : "Pay now"}
      </button>

      <p className="text-xs text-[var(--text-muted)]">
        Card, bank account or mobile wallet. Your balance updates automatically once PayFast confirms
        the payment — no waiting for an admin.
      </p>
    </form>
  );
}
