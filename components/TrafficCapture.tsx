"use client";

import { useEffect } from "react";

// Capture UTM parameters + referrer + landing page on first visit and persist
// for 30 days. Used by the checkout flow to attribute the order.
//
// Cookie format: JSON-encoded under "subscribai_attribution".
// Only writes the cookie ONCE per visit (first-touch attribution). Subsequent
// visits without UTM params don't overwrite the original source.
export default function TrafficCapture() {
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

  return null;
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
