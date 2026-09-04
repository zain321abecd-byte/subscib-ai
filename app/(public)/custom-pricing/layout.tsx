import type { Metadata } from "next";

/**
 * The page itself is a client component (form state), so its metadata lives
 * here — same pattern as cart / checkout / prices.
 */
export const metadata: Metadata = {
  title: "Custom Pricing Request — Build Your Own AI Bundle",
  description:
    "Tell us which AI tools your team needs and how many seats, and we'll quote a custom bundle price. Monthly or yearly billing, no commitment to request.",
  alternates: { canonical: "/custom-pricing" },
  openGraph: {
    title: "Request custom AI subscription pricing",
    description:
      "Pick the tools, tell us the team size, get a tailored bundle quote from SubscribAI.",
    url: "/custom-pricing",
  },
};

export default function CustomPricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
