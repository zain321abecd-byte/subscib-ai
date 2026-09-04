import type { Metadata } from "next";
import NotFoundPanel from "@/components/NotFoundPanel";

export const metadata: Metadata = {
  title: "Page not found",
  description: "That page doesn't exist. Browse premium AI subscriptions, pricing bundles, or contact SubscribAI support.",
  robots: { index: false, follow: true },
};

/**
 * 404 boundary for the public segment — this is what a notFound() from
 * /product/[id], /blog/[slug], or /author/[slug] renders, so the shopper keeps
 * the site header, footer, and cart while they recover.
 */
export default function PublicNotFound() {
  return <NotFoundPanel />;
}
