import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shop — Every AI Tool, One Cart",
  description:
    "Browse 60+ premium AI subscriptions, design tools, productivity apps, automation packs, and courses. Filter by category, sort by price, pay locally in PKR.",
  alternates: { canonical: "/shop" },
  openGraph: {
    title: "Shop AI Subscriptions in Pakistan — Pay in PKR",
    description: "60+ premium AI tools, automation packs, and courses. JazzCash, Easypaisa, or Card.",
    url: "/shop",
  },
};

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return children;
}
