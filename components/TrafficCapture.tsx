"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { getSupabaseBrowser, isSupabaseConfigured } from "@/lib/supabase/browser";
import { apiBaseUrlSafe, authHeaders } from "@/lib/api-client";

// Capture UTM parameters + referrer + landing page on first visit and persist
// for 30 days. Used by the checkout flow to attribute the order.
//
// Cookie format: JSON-encoded under "subscribai_attribution".
// Only writes the cookie ONCE per visit (first-touch attribution). Subsequent
// visits without UTM params don't overwrite the original source.
export default function TrafficCapture() {
  const pathname = usePathname();

  useEffect(() => {
    try {
      const COOKIE = "subscribai_attribution";
      const days = 30;

      // Already captured?
      const existing = document.cookie.split("; ").find((c) => c.startsWith(`${COOKIE}=`));

      const url = new URL(window.location.href);
      const params = url.searchParams;
      const utm_source   = params.get("utm_source")   || "";
      const utm_medium   = params.get("utm_medium")   || "";
      const utm_campaign = params.get("utm_campaign") || "";

      const referrer = document.referrer || "";
      const landing  = window.location.href;

      // If we already have attribution AND this visit has no UTM params, don't
      // overwrite — preserves the original source.
      if (existing && !utm_source && !utm_medium && !utm_campaign) return;

      // If this is a fresh visit OR has UTM params, capture.
      // Skip self-referrals.
      const refOk = referrer && !referrer.startsWith(window.location.origin);
      const payload = {
        utm_source: utm_source || null,
        utm_medium: utm_medium || null,
        utm_campaign: utm_campaign || null,
        referrer: refOk ? referrer : null,
        landing_page: landing,
        captured_at: new Date().toISOString(),
      };

      // Don't bother saving if there's no useful info at all.
      if (!utm_source && !utm_medium && !utm_campaign && !refOk) return;

      const expires = new Date(Date.now() + days * 86400_000).toUTCString();
      document.cookie = `${COOKIE}=${encodeURIComponent(JSON.stringify(payload))}; expires=${expires}; path=/; SameSite=Lax`;
    } catch {
      // Best-effort — don't break the page if cookies are blocked.
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    async function send(eventType: "pageview" | "heartbeat") {
      try {
        const sessionId = getOrCreateTrafficSessionId();
        const attribution = readAttribution();
        if (isSupabaseConfigured()) {
          await getSupabaseBrowser().auth.getUser().catch(() => null);
        }
        if (cancelled) return;

        const payload = {
          event_type: eventType,
          session_id: sessionId,
          page_url: window.location.href,
          page_path: window.location.pathname,
          referrer: document.referrer || attribution.referrer || null,
          landing_page: attribution.landing_page || window.location.href,
          utm_source: attribution.utm_source ?? null,
          utm_medium: attribution.utm_medium ?? null,
          utm_campaign: attribution.utm_campaign ?? null,
        };

        const body = JSON.stringify(payload);
        const trafficUrl = `${apiBaseUrlSafe()}/traffic`;
        if (navigator.sendBeacon && eventType === "heartbeat") {
          // Beacon can't carry an Authorization header — heartbeats stay anonymous.
          navigator.sendBeacon(trafficUrl, new Blob([body], { type: "application/json" }));
          return;
        }

        await fetch(trafficUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(await authHeaders()) },
          body,
          keepalive: true,
        });
      } catch {
        // Best-effort analytics. Never block the storefront.
      }
    }

    send("pageview");
    timer = setInterval(() => send("heartbeat"), 45_000);

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [pathname]);

  return null;
}

function getOrCreateTrafficSessionId() {
  const KEY = "subscribai_traffic_session";
  try {
    const existing = localStorage.getItem(KEY);
    if (existing) return existing;
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(KEY, id);
    return id;
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

/** Read the captured attribution from cookie. Returns {} if none. */
export function readAttribution(): {
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  referrer?: string | null;
  landing_page?: string | null;
} {
  if (typeof document === "undefined") return {};
  try {
    const COOKIE = "subscribai_attribution";
    const c = document.cookie.split("; ").find((c) => c.startsWith(`${COOKIE}=`));
    if (!c) return {};
    const raw = decodeURIComponent(c.split("=")[1] || "");
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}
