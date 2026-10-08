"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelPayFastTopUp } from "@/lib/panel/actions/payfast";
import { Badge, Money, PaymentBadge, Td } from "@/components/panel/ui";
import type { PaymentRequest } from "@/lib/panel/types";

export default function TopUpRow({ request, currency }: { request: PaymentRequest; currency: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const cancelled =
    request.status === "rejected" &&
    (request.admin_note?.startsWith("Cancelled by customer") ||
      request.admin_note?.startsWith("Cancelled automatically"));
  const canCancel = request.gateway === "payfast" && request.status === "pending" && !request.gateway_txn_id;

  function cancel() {
    if (!window.confirm(`Cancel this pending ${Number(request.amount).toLocaleString("en-PK")} ${currency} PayFast payment?`)) return;
    setError(null);
    startTransition(async () => {
      const result = await cancelPayFastTopUp(request.id);
      if (!result.ok) { setError(result.error); return; }
      router.refresh();
    });
  }

  return (
    <tr>
      <Td className="whitespace-nowrap text-[var(--text-muted)]">
        {new Date(request.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
      </Td>
      <Td align="right" className="whitespace-nowrap font-semibold text-[var(--text)]">
        <Money value={request.amount} currency={currency} />
      </Td>
      <Td className="text-[var(--text-muted)]">
        {request.gateway === "payfast" ? "PayFast" : <span className="capitalize">{request.method}</span>}
      </Td>
      <Td className="text-[var(--text-muted)]">
        {request.gateway === "payfast" ? request.gateway_txn_id || request.basket_id || "—" : request.reference || "—"}
      </Td>
      <Td>
        {cancelled ? <Badge>Cancelled</Badge> : <PaymentBadge status={request.status} />}
        {request.admin_note && <div className="mt-1 max-w-[220px] text-xs text-[var(--text-muted)]">{request.admin_note}</div>}
        {canCancel && (
          <button
            type="button"
            className="panel-btn panel-btn-ghost mt-2 !px-2.5 !py-1 text-xs text-red-600 dark:text-red-400"
            onClick={cancel}
            disabled={pending}
          >
            {pending ? "Cancelling…" : "Cancel payment"}
          </button>
        )}
        {error && <div role="alert" className="mt-1 max-w-[240px] text-xs text-red-600 dark:text-red-400">{error}</div>}
      </Td>
    </tr>
  );
}
