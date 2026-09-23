"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { requestTopUp } from "@/lib/panel/actions/admin";

const METHODS = [
  { value: "bank", label: "Bank transfer" },
  { value: "jazzcash", label: "JazzCash" },
  { value: "easypaisa", label: "EasyPaisa" },
  { value: "other", label: "Other" },
];

export default function TopUpForm({ currency }: { currency: string }) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("bank");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const value = Number(amount);
  const valid = Number.isFinite(value) && value > 0;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await requestTopUp({ amount: value, method, reference, note });
    setBusy(false);
    if (!res.ok) { setError(res.error); return; }
    setDone(true);
    setAmount("");
    setReference("");
    setNote("");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} noValidate className="panel-card grid gap-4 p-5">
      {done && (
        <div role="status" className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
          Request submitted. Your balance updates once an administrator confirms the payment — you&apos;ll
          see it in the list below.
        </div>
      )}

      <div>
        <label className="panel-label" htmlFor="amount">Amount ({currency})</label>
        <input
          id="amount"
          className="panel-input"
          value={amount}
          onChange={(e) => { setAmount(e.target.value); setDone(false); }}
          inputMode="decimal"
          placeholder="5000"
        />
      </div>

      <div>
        <label className="panel-label" htmlFor="method">How you paid</label>
        <select id="method" className="panel-input" value={method} onChange={(e) => setMethod(e.target.value)}>
          {METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
      </div>

      <div>
        <label className="panel-label" htmlFor="reference">Transaction reference</label>
        <input
          id="reference"
          className="panel-input"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="TRX123456789"
        />
        <p className="mt-1.5 text-xs text-[var(--text-muted)]">
          The ID from your bank or wallet app. It&apos;s what the administrator matches your payment against.
        </p>
      </div>

      <div>
        <label className="panel-label" htmlFor="note">Note (optional)</label>
        <textarea id="note" rows={2} className="panel-input" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      <button type="submit" className="panel-btn panel-btn-primary" disabled={!valid || busy}>
        {busy ? "Submitting…" : "Submit top-up request"}
      </button>

      <p className="text-xs text-[var(--text-muted)]">
        Submitting doesn&apos;t move money on its own — an administrator confirms the payment arrived and then
        credits your wallet.
      </p>
    </form>
  );
}
