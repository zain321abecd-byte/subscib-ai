import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shop — Every AI Tool, One Cart",
  description:
    "Browse 60+ premium AI subscriptions, design tools, productivity apps, automation packs, and courses. Filter by category, sort by price.",
  alternates: { canonical: "/shop" },
  openGraph: {
    title: "Shop premium AI Subscriptions",
    description: "60+ premium AI tools, automation packs, and courses. Activated to your inbox in under 30 minutes.",
    url: "/shop",
  },
};

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return children;
}
