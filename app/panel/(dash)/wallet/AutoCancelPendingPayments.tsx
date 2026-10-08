"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { expirePendingPayFastTopUps } from "@/lib/panel/actions/payfast";

export default function AutoCancelPendingPayments({ expiresAt }: { expiresAt: string[] }) {
  const router = useRouter();
  const running = useRef(false);

  useEffect(() => {
    if (!expiresAt.length) return;

    const nextExpiry = Math.min(...expiresAt.map((value) => new Date(value).getTime()));
    const delay = Math.max(0, nextExpiry - Date.now()) + 150;
    const timer = window.setTimeout(async () => {
      if (running.current) return;
      running.current = true;
      try {
        await expirePendingPayFastTopUps();
        router.refresh();
      } finally {
        running.current = false;
      }
    }, delay);

    return () => window.clearTimeout(timer);
  }, [expiresAt, router]);

  return null;
}
