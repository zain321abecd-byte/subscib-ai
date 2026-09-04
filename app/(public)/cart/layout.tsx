import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Your Cart",
  description: "Review the AI subscriptions in your SubscribAI cart before checkout.",
  // Without an explicit canonical this page inherits the root layout's "/",
  // telling crawlers the cart *is* the homepage.
  alternates: { canonical: "/cart" },
  robots: { index: false, follow: true },
};
export default function CartLayout({ children }: { children: React.ReactNode }) { return children; }
