import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Complete your SubscribAI order — pay by card, bank transfer, JazzCash, or Easypaisa.",
  // Without an explicit canonical this page inherits the root layout's "/".
  alternates: { canonical: "/checkout" },
  robots: { index: false, follow: true },
};
export default function CheckoutLayout({ children }: { children: React.ReactNode }) { return children; }
