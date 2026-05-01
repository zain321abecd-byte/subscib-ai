import type { Metadata, Viewport } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--next-font-body", display: "swap" });
const poppins = Poppins({ subsets: ["latin"], weight: ["500", "600", "700", "800"], variable: "--next-font-heading", display: "swap" });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://subscribai.com";
const SITE_NAME = "SubscribAI";
const DEFAULT_DESCRIPTION =
  "Premium AI subscriptions delivered to Pakistan in minutes. ChatGPT Plus, Claude Pro, Midjourney, Canva, Notion AI, automation packs, and full courses — paid in PKR via JazzCash, Easypaisa, or local card.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Premium AI Subscriptions in Pakistan, Paid in PKR`,
    template: `%s · ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "ChatGPT Plus Pakistan", "Claude Pro Pakistan", "Midjourney Pakistan",
    "AI subscriptions Pakistan", "buy ChatGPT Pakistan", "Canva Pro Pakistan",
    "Notion AI Pakistan", "JazzCash AI tools", "Easypaisa AI subscriptions",
    "AI tools PKR", "automation Pakistan", "SahulatPay AI",
  ],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "shopping",
  alternates: { canonical: "/" },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true, follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_PK",
    url: SITE_URL,
    title: `${SITE_NAME} — Premium AI Subscriptions, Paid in PKR`,
    description: DEFAULT_DESCRIPTION,
    images: [{
      url: "/assets/subscribai-logo-transparent-full.png",
      width: 1200,
      height: 630,
      alt: `${SITE_NAME} — AI subscriptions for Pakistan`,
    }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — Premium AI Subscriptions, Paid in PKR`,
    description: DEFAULT_DESCRIPTION,
    images: ["/assets/subscribai-logo-transparent-full.png"],
  },
  icons: {
    icon: [{ url: "/assets/favicon.png", type: "image/png" }],
    apple: "/assets/favicon.png",
  },
  manifest: "/manifest.webmanifest",
  formatDetection: { telephone: false, address: false, email: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)",  color: "#0A0A0E" },
    { media: "(prefers-color-scheme: light)", color: "#FF7A1A" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`} suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css"
          integrity="sha512-SnH5WK+bZxgPHs44uWIX+LLJAJ9/2PkPKZ5QiAj6Ta86w+fsb2TkcmfRyVX3pBnMFcV7oQPJkl9QevSCWr3W6A=="
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
        />
      </head>
      {/* Body className is set by the section layout via `data-shell` so each
          surface (public vs admin) controls its own visual reset without
          forcing the root layout to read request headers. */}
      <body className="v2">{children}</body>
    </html>
  );
}
