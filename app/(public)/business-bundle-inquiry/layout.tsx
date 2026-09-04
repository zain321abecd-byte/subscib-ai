import type { Metadata } from "next";

/**
 * The page itself is a client component (form state), so its metadata lives
 * here — same pattern as cart / checkout / prices.
 */
export const metadata: Metadata = {
  title: "Business Bundle Inquiry — AI Subscriptions for Teams",
  description:
    "Kit out your whole team with premium AI subscriptions on one invoice. Tell us your company, team size, and the tools you need, and our sales team will reply with a bundle price.",
  alternates: { canonical: "/business-bundle-inquiry" },
  openGraph: {
    title: "AI subscription bundles for businesses",
    description:
      "One invoice, every tool your team needs. Talk to SubscribAI about a business bundle.",
    url: "/business-bundle-inquiry",
  },
};

export default function BusinessBundleInquiryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
