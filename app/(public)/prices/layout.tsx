import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Pricing — Bundles for Creators, Teams & Businesses",
  description: "Save with pre-mixed AI subscription bundles — Creator, Growth, and Business tiers. Cancel anytime.",
  alternates: { canonical: "/prices" },
  openGraph: { title: "Pricing — SubscribAI Bundles", description: "Three bundles for solo creators, growing teams, and agencies.", url: "/prices" },
};
export default function PricesLayout({ children }: { children: React.ReactNode }) { return children; }
