"use client";

import { useEffect, useRef, useState } from "react";
import { apiBaseUrlSafe } from "@/lib/api-client";

type PollResp = {
  success?: boolean;
  status?: "pending" | "paid" | "failed" | "delivered" | "refunded" | "cancelled";
};

/**
 * Mounted on the /thank-you page for orders whose redirect-time status was
 * "pending". Polls /payments/status until the order flips to a terminal
 * state (paid/failed/delivered/refunded), then reloads the page so the
 * server re-renders with the new status pill.
 *
 * Intentionally bails out after ~2 minutes — by then any legitimate IPN
 * has either arrived or PayFast has timed out on their side.
 */
export default function OrderStatusPoller({ orderId }: { orderId: string }) {
  const [tries, setTries] = useState(0);
  const stopped = useRef(false);

  useEffect(() => {
    if (!orderId) return;
    const base = apiBaseUrlSafe();
    if (!base) return;

    const MAX = 20;            // ~2 minutes at 6s intervals
    const INTERVAL_MS = 6_000;
    let active = true;

    const tick = async () => {
      if (!active || stopped.current) return;
      try {
        const res = await fetch(`${base}/payments/status?basketId=${encodeURIComponent(orderId)}`);
        const data = (await res.json()) as PollResp;
        if (data?.status && data.status !== "pending") {
          stopped.current = true;
          const url = new URL(window.location.href);
          url.searchParams.set("status", data.status);
          /* Clear hashOk. The redirect sets hashOk=0 when PayFast's
             validation hash does not verify, and the page then refuses to
             show "paid" no matter what — so it re-rendered as pending, the
             poller confirmed paid again, reloaded, and looped forever. This
             status came from our own database via the API, which is more
             authoritative than a hash on a query string. */
          url.searchParams.delete("hashOk");

          // Only reload if the URL actually changes, otherwise the reload
          // itself would retrigger this same branch.
          if (url.toString() !== window.location.href) {
            window.location.replace(url.toString());
          }
          return;
        }
      } catch {
        // network blip — keep polling
      }
      setTries((n) => n + 1);
    };

    if (tries >= MAX) {
      stopped.current = true;
      return;
    }
    const t = window.setTimeout(tick, INTERVAL_MS);
    return () => {
      active = false;
      window.clearTimeout(t);
    };
  }, [orderId, tries]);

  return (
    <div style={{ marginTop: "var(--space-4)", textAlign: "center", color: "var(--text-muted)", fontSize: "var(--fs-sm)" }}>
      <i className="fa-solid fa-circle-notch fa-spin" style={{ marginRight: 6 }}></i>
      Confirming with PayFast… this usually takes a few seconds.
    </div>
  );
}
