/**
 * Google Consent Mode v2 support.
 *
 * Google requires consent signals for visitors in the EEA, UK and
 * Switzerland. Everywhere else (including Pakistan, this store's main
 * market) analytics may run without a banner, so defaults stay granted
 * there and no banner is shown — consent UI only appears where it is
 * actually required.
 */

/** EU/EEA + UK + Switzerland — the regions Google requires consent for. */
export const CONSENT_REQUIRED_COUNTRIES = [
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR",
  "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK",
  "SI", "ES", "SE", // EU
  "IS", "LI", "NO", // EEA
  "GB", "CH",       // UK + Switzerland
];

/** localStorage key holding the visitor's stored choice. */
export const CONSENT_STORAGE_KEY = "subscribai_consent_v1";

/** Window event that re-opens the consent banner (fired by the footer link). */
export const OPEN_CONSENT_EVENT = "subscribai:open-consent";

export function isConsentRequired(country: string | null | undefined): boolean {
  return !!country && CONSENT_REQUIRED_COUNTRIES.includes(country.toUpperCase());
}

/**
 * Inline script injected before the GA loader. It must run synchronously so
 * the consent state is queued on the dataLayer before gtag.js reads it —
 * otherwise a hit can fire ahead of the visitor's choice.
 */
export const CONSENT_DEFAULT_SCRIPT = `
window.dataLayer=window.dataLayer||[];
function gtag(){dataLayer.push(arguments);}
gtag('consent','default',{
  ad_storage:'denied',
  ad_user_data:'denied',
  ad_personalization:'denied',
  analytics_storage:'denied',
  functionality_storage:'granted',
  security_storage:'granted',
  region:${JSON.stringify(CONSENT_REQUIRED_COUNTRIES)},
  wait_for_update:500
});
gtag('consent','default',{
  ad_storage:'granted',
  ad_user_data:'granted',
  ad_personalization:'granted',
  analytics_storage:'granted',
  functionality_storage:'granted',
  security_storage:'granted'
});
gtag('set','ads_data_redaction',true);
gtag('set','url_passthrough',true);
try{
  var stored=localStorage.getItem('${CONSENT_STORAGE_KEY}');
  if(stored){gtag('consent','update',JSON.parse(stored));}
}catch(e){}
`.trim();
