"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelPayFastTopUp } from "@/lib/panel/actions/payfast";
import { Badge, Money, PaymentBadge } from "@/components/panel/ui";
import type { PaymentRequest } from "@/lib/panel/types";

export default function TopUpCard({ request, currency }: { request: PaymentRequest; currency: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const cancelled = request.status === "rejected" &&
    (request.admin_note?.startsWith("Cancelled by customer") || request.admin_note?.startsWith("Cancelled automatically"));
  const canCancel = request.gateway === "payfast" && request.status === "pending" && !request.gateway_txn_id;

  function cancel() {
    start(async () => {
      const result = await cancelPayFastTopUp(request.id);
      if (!result.ok) return setError(result.error);
      router.refresh();
    });
  }

  return (
    <article className="panel-card grid gap-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-xs text-[var(--text-muted)]">{new Date(request.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</p><p className="mt-1 text-lg font-bold text-[var(--text)]"><Money value={request.amount} currency={currency} /></p></div>
        {cancelled ? <Badge>Cancelled</Badge> : <PaymentBadge status={request.status} />}
      </div>
      <div className="grid grid-cols-2 gap-2 rounded-xl bg-[var(--surface-2)] p-3 text-xs">
        <div><p className="text-[var(--text-muted)]">Method</p><p className="mt-0.5 font-semibold text-[var(--text)]">{request.gateway === "payfast" ? "PayFast" : request.method}</p></div>
        <div className="min-w-0"><p className="text-[var(--text-muted)]">Reference</p><p className="mt-0.5 truncate font-semibold text-[var(--text)]">{request.gateway_txn_id || request.basket_id || request.reference || "—"}</p></div>
      </div>
      {request.admin_note && <p className="text-xs text-[var(--text-muted)]">{request.admin_note}</p>}
      {canCancel && <button type="button" className="panel-btn panel-btn-ghost !py-2 text-xs text-red-600" disabled={pending} onClick={cancel}>{pending ? "Cancelling…" : "Cancel payment"}</button>}
      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
    </article>
  );
}
