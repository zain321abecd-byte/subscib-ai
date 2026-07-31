"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CONSENT_STORAGE_KEY, OPEN_CONSENT_EVENT } from "@/lib/consent";

type ConsentState = {
  ad_storage: "granted" | "denied";
  ad_user_data: "granted" | "denied";
  ad_personalization: "granted" | "denied";
  analytics_storage: "granted" | "denied";
};

const ACCEPT_ALL: ConsentState = {
  ad_storage: "granted",
  ad_user_data: "granted",
  ad_personalization: "granted",
  analytics_storage: "granted",
};

const ANALYTICS_ONLY: ConsentState = {
  ad_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied",
  analytics_storage: "granted",
};

const REJECT_ALL: ConsentState = {
  ad_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied",
  analytics_storage: "denied",
};

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

/**
 * Consent Mode v2 banner.
 *
 * `autoShow` (true only where Google requires consent — the layout decides
 * that server-side from the Vercel geo header) controls whether the banner
 * appears by itself on a first visit. It is mounted everywhere regardless,
 * so the footer's "Cookie settings" link can re-open it for any visitor:
 * consent has to be as easy to withdraw as it was to give.
 */
export default function ConsentBanner({ autoShow = false }: { autoShow?: boolean }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (autoShow) {
      try {
        if (!localStorage.getItem(CONSENT_STORAGE_KEY)) setVisible(true);
      } catch {
        // Storage blocked (private mode): show it rather than assume consent.
        setVisible(true);
      }
    }
    const open = () => setVisible(true);
    window.addEventListener(OPEN_CONSENT_EVENT, open);
    return () => window.removeEventListener(OPEN_CONSENT_EVENT, open);
  }, [autoShow]);

  function choose(state: ConsentState) {
    try {
      localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Non-fatal — the choice still applies for this page view.
    }
    // gtag is defined by the inline consent-default script in the layout.
    if (typeof window.gtag === "function") {
      window.gtag("consent", "update", state);
    } else {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push(["consent", "update", state]);
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="consent-banner" role="dialog" aria-live="polite" aria-label="Cookie consent">
      <div className="consent-banner-inner">
        <div className="consent-banner-text">
          <strong>We use cookies</strong>
          <p>
            We use cookies to measure how the site is used and to improve it. You can accept all,
            allow only analytics, or decline. See our{" "}
            <Link href="/privacy">privacy policy</Link>.
          </p>
        </div>
        <div className="consent-banner-actions">
          <button type="button" className="consent-btn consent-btn-ghost" onClick={() => choose(REJECT_ALL)}>
            Decline
          </button>
          <button type="button" className="consent-btn consent-btn-ghost" onClick={() => choose(ANALYTICS_ONLY)}>
            Analytics only
          </button>
          <button type="button" className="consent-btn consent-btn-primary" onClick={() => choose(ACCEPT_ALL)}>
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}
