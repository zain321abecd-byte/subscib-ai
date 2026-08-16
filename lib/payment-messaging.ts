/**
 * Shared public payment messaging. Keep gateway/payment-option logic separate:
 * this file is only for marketing and helper copy shown to shoppers.
 */
export const paymentFeatureTitle = "Pay in Your Local Currency";

export const paymentFeatureDescription =
  "Pay securely with Mastercard, Visa, and other supported payment methods. Built for local and international clients.";

export const paymentMethodFaqAnswer =
  "We support Mastercard, Visa, and other available payment methods through our secure payment gateway. We never see or store your card number.";

/* Region-aware variants.
 *
 * Outside Pakistan there is exactly one rail (card) and one currency (USD),
 * so the generic "local currency / other payment methods" copy above is
 * misleading there — it implies wallet options and local-currency settlement
 * that a foreign buyer will never be offered. The constants above are kept
 * for the surfaces that have no region context. */

export function paymentFeatureTitleFor(isPK: boolean) {
  return isPK ? paymentFeatureTitle : "Pay by Card in USD";
}

export function paymentFeatureDescriptionFor(isPK: boolean) {
  return isPK
    ? paymentFeatureDescription
    : "Pay securely in USD with Visa or Mastercard through our payment gateway. We never see or store your card number.";
}

export function paymentMethodFaqAnswerFor(isPK: boolean) {
  return isPK
    ? paymentMethodFaqAnswer
    : "Outside Pakistan we accept Visa and Mastercard, charged in USD through our secure payment gateway. Local wallet options are only available to customers in Pakistan. We never see or store your card number.";
}

export function replaceLegacyPaymentCopy(value: string): string {
  return value
    .replace(/Pay in PKR/gi, paymentFeatureTitle)
    .replace(/JazzCash,\s*Easypaisa,\s*or card\.\s*No forex hassle\./gi, paymentFeatureDescription)
    .replace(/Pay locally with JazzCash,\s*Easypaisa,\s*or any card\./gi, `${paymentFeatureTitle}.`)
    .replace(/Pay with JazzCash,\s*Easypaisa,\s*or card\.\s*No forex headache\./gi, paymentFeatureDescription)
    .replace(/Premium AI subscriptions,\s*paid in PKR/gi, "Premium AI subscriptions, paid in your local currency")
    .replace(/paid in PKR/gi, "paid in your local currency");
}
