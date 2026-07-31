"use client";

import { OPEN_CONSENT_EVENT } from "@/lib/consent";

/**
 * Footer entry point for re-opening the consent choices. Consent must be
 * withdrawable as easily as it was given, and visitors outside the EEA can
 * use this to opt out even though no banner is shown to them automatically.
 */
export default function CookieSettingsLink() {
  return (
    <button
      type="button"
      className="footer-linklike"
      onClick={() => window.dispatchEvent(new Event(OPEN_CONSENT_EVENT))}
    >
      Cookie settings
    </button>
  );
}
