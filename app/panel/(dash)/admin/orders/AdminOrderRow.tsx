"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sendOrderToProvider, updateOrderStatus } from "@/lib/panel/actions/orders";
import { Money, OrderBadge, Td } from "@/components/panel/ui";
import { ORDER_STATUS_LABELS, type Order, type OrderStatus } from "@/lib/panel/types";

export default function AdminOrderRow({ order, customer }: { order: Order; customer: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [note, setNote] = useState(order.note ?? "");
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  const willRefund =
    (status === "cancelled" || status === "failed") && !order.refunded_at && Number(order.charge) > 0;

  function save(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    start(async () => {
      const res = await updateOrderStatus(order.id, status, note);
      if (!res.ok) { setMessage({ text: res.error, ok: false }); return; }
      setOpen(false);
      router.refresh();
    });
  }

  function forward() {
    setMessage(null);
    start(async () => {
      const res = await sendOrderToProvider(order.id);
      setMessage(
        res.ok
          ? { text: `Sent — provider order ${res.data!.providerOrderId}`, ok: true }
          : { text: res.error, ok: false },
      );
      router.refresh();
    });
  }

  return (
    <>
      <tr>
        <Td className="whitespace-nowrap text-[var(--text-muted)]">
          {new Date(order.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
        </Td>
        <Td className="max-w-[160px] truncate text-[var(--text)]" >{customer}</Td>
        <Td>
          <div className="font-medium text-[var(--text)]">{order.service_name}</div>
          <a href={order.link} target="_blank" rel="noopener noreferrer"
             className="block max-w-[220px] truncate text-xs text-brand-600 hover:underline dark:text-brand-400">
            {order.link}
          </a>
          {order.provider_order_id && (
            <div className="text-xs text-[var(--text-muted)]">provider #{order.provider_order_id}</div>
          )}
        </Td>
        <Td align="right" className="whitespace-nowrap">{order.quantity.toLocaleString()}</Td>
        <Td align="right" className="whitespace-nowrap font-semibold text-[var(--text)]">
          <Money value={order.charge} />
          {order.refunded_at && <div className="text-xs font-normal text-[var(--text-muted)]">refunded</div>}
        </Td>
        <Td><OrderBadge status={order.status} /></Td>
        <Td align="right">
          <div className="flex flex-wrap justify-end gap-1.5">
            <button type="button" className="panel-btn panel-btn-ghost !px-2.5 !py-1 text-xs"
                    onClick={() => setOpen((v) => !v)} disabled={pending}>
              {open ? "Cancel" : "Update"}
            </button>
            {!order.provider_order_id && (
              <button type="button" className="panel-btn panel-btn-ghost !px-2.5 !py-1 text-xs"
                      onClick={forward} disabled={pending}>
                Send to provider
              </button>
            )}
          </div>
        </Td>
      </tr>

      {(open || message) && (
        <tr>
          <td colSpan={7} className="border-b border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
            {message && (
              <p role={message.ok ? "status" : "alert"}
                 className={`mb-2 text-sm font-medium ${message.ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                {message.text}
              </p>
            )}

            {open && (
              <form onSubmit={save} className="flex flex-wrap items-end gap-2">
                <div>
                  <label className="panel-label" htmlFor={`status-${order.id}`}>Status</label>
                  <select id={`status-${order.id}`} className="panel-input !py-1.5 text-sm" value={status}
                          onChange={(e) => setStatus(e.target.value as OrderStatus)}>
                    {(Object.keys(ORDER_STATUS_LABELS) as OrderStatus[]).map((s) => (
                      <option key={s} value={s}>{ORDER_STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                </div>
                <div className="min-w-[220px] flex-1">
                  <label className="panel-label" htmlFor={`note-${order.id}`}>Note</label>
                  <input id={`note-${order.id}`} className="panel-input !py-1.5 text-sm" value={note}
                         onChange={(e) => setNote(e.target.value)} placeholder="Visible to the customer" />
                </div>
                <button type="submit" className="panel-btn panel-btn-primary !py-1.5 text-sm" disabled={pending}>
                  {pending ? "Saving…" : "Save"}
                </button>
                {willRefund && (
                  <p className="w-full text-xs font-medium text-amber-700 dark:text-amber-400">
                    Saving this refunds <Money value={order.charge} /> to the customer&apos;s wallet. It only happens once.
                  </p>
                )}
              </form>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
