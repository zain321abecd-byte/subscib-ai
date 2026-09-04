import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Your Account",
  description: "Your SubscribAI orders, delivery status, and account details.",
  // Without an explicit canonical this page inherits the root layout's "/".
  alternates: { canonical: "/account" },
  robots: { index: false, follow: false },
};

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return children;
}
