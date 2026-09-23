"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reviewTopUp } from "@/lib/panel/actions/admin";
import { Money, PaymentBadge, Td } from "@/components/panel/ui";
import type { PaymentRequest } from "@/lib/panel/types";

export default function PaymentRow({
  request, customer,
}: {
  request: PaymentRequest;
  customer: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [note, setNote] = useState(request.admin_note ?? "");
  const [showNote, setShowNote] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function review(decision: "approved" | "rejected") {
    if (
      decision === "approved" &&
      !window.confirm(
        `Credit ${Number(request.amount).toLocaleString("en-PK", { minimumFractionDigits: 2 })} PKR to ${customer}? Only do this once the money has actually arrived.`,
      )
    ) return;

    setError(null);
    start(async () => {
      const res = await reviewTopUp(request.id, decision, note);
      if (!res.ok) { setError(res.error); return; }
      setShowNote(false);
      router.refresh();
    });
  }

  const open = request.status === "pending";

  return (
    <>
      <tr>
        <Td className="whitespace-nowrap text-[var(--text-muted)]">
          {new Date(request.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
        </Td>
        <Td className="max-w-[180px] truncate text-[var(--text)]">{customer}</Td>
        <Td align="right" className="whitespace-nowrap font-semibold text-[var(--text)]">
          <Money value={request.amount} />
        </Td>
        <Td className="text-[var(--text-muted)]">{request.method}</Td>
        <Td>
          <div className="max-w-[160px] truncate text-[var(--text)]">{request.reference || "—"}</div>
          {request.note && <div className="max-w-[160px] truncate text-xs text-[var(--text-muted)]">{request.note}</div>}
        </Td>
        <Td>
          <PaymentBadge status={request.status} />
          {request.admin_note && (
            <div className="mt-1 max-w-[160px] truncate text-xs text-[var(--text-muted)]" title={request.admin_note}>
              {request.admin_note}
            </div>
          )}
        </Td>
        <Td align="right">
          {open ? (
            <div className="flex flex-wrap justify-end gap-1.5">
              <button type="button" className="panel-btn panel-btn-primary !px-2.5 !py-1 text-xs"
                      onClick={() => review("approved")} disabled={pending}>
                Approve
              </button>
              <button type="button" className="panel-btn panel-btn-ghost !px-2.5 !py-1 text-xs"
                      onClick={() => review("rejected")} disabled={pending}>
                Reject
              </button>
              <button type="button" className="panel-btn panel-btn-ghost !px-2.5 !py-1 text-xs"
                      onClick={() => setShowNote((v) => !v)} disabled={pending}>
                Note
              </button>
            </div>
          ) : (
            <span className="text-xs text-[var(--text-muted)]">
              {request.reviewed_at
                ? `reviewed ${new Date(request.reviewed_at).toLocaleDateString(undefined, { day: "numeric", month: "short" })}`
                : "—"}
            </span>
          )}
        </Td>
      </tr>

      {(showNote || error) && (
        <tr>
          <td colSpan={7} className="border-b border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
            {error && <p role="alert" className="mb-2 text-sm font-medium text-red-600 dark:text-red-400">{error}</p>}
            {showNote && (
              <div>
                <label className="panel-label" htmlFor={`pnote-${request.id}`}>
                  Note to attach to your decision
                </label>
                <input id={`pnote-${request.id}`} className="panel-input !py-1.5 text-sm max-w-md" value={note}
                       onChange={(e) => setNote(e.target.value)}
                       placeholder="Reference didn't match any incoming transfer" />
                <p className="mt-1.5 text-xs text-[var(--text-muted)]">
                  Saved when you approve or reject — the customer sees it beside their request.
                </p>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
