/**
 * Shared public payment messaging. Keep gateway/payment-option logic separate:
 * this file is only for marketing and helper copy shown to shoppers.
 */
export const paymentFeatureTitle = "Pay in Your Local Currency";

export const paymentFeatureDescription =
  "Pay securely with Mastercard, Visa, and other supported payment methods. Built for local and international clients.";

export const paymentMethodFaqAnswer =
  "We support Mastercard, Visa, and other available payment methods through our secure payment gateway. We never see or store your card number.";

export function replaceLegacyPaymentCopy(value: string): string {
  return value
    .replace(/Pay in PKR/gi, paymentFeatureTitle)
    .replace(/JazzCash,\s*Easypaisa,\s*or card\.\s*No forex hassle\./gi, paymentFeatureDescription)
    .replace(/Pay locally with JazzCash,\s*Easypaisa,\s*or any card\./gi, `${paymentFeatureTitle}.`)
    .replace(/Pay with JazzCash,\s*Easypaisa,\s*or card\.\s*No forex headache\./gi, paymentFeatureDescription)
    .replace(/Premium AI subscriptions,\s*paid in PKR/gi, "Premium AI subscriptions, paid in your local currency")
    .replace(/paid in PKR/gi, "paid in your local currency");
}
