import type { Metadata, Viewport } from "next";
import { Inter, Poppins } from "next/font/google";
import { getSiteSettings } from "@/lib/site-settings";
import "./globals.css";
import "./tailwind.css";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--next-font-body", display: "swap" });
const poppins = Poppins({ subsets: ["latin"], weight: ["500", "600", "700", "800"], variable: "--next-font-heading", display: "swap" });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://subscribai.com";
const SITE_NAME = "SubscribAI";
const DEFAULT_DESCRIPTION =
  "Premium AI subscriptions delivered in minutes. ChatGPT Plus, Claude Pro, Midjourney, Canva, Notion AI, automation packs, and full courses.";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSiteSettings();
  const title = s.seo_site_title?.trim() || `${SITE_NAME} — Premium AI Subscriptions`;
  const description = s.seo_default_description?.trim() || DEFAULT_DESCRIPTION;
  const keywords = (s.seo_default_keywords || "").split(",").map((k) => k.trim()).filter(Boolean);
  const ogImage = s.seo_og_image?.trim() || "/assets/subscribai-logo-transparent-full.png";
  const twitterHandle = s.seo_twitter_handle?.trim() || "";
  const indexable = (s.seo_index_site ?? "true") !== "false";
  const verification = s.seo_google_verification?.trim() || "";

  const meta: Metadata = {
    metadataBase: new URL(SITE_URL),
    title: { default: title, template: `%s · ${SITE_NAME}` },
    description,
    applicationName: SITE_NAME,
    keywords: keywords.length > 0 ? keywords : undefined,
    authors: [{ name: SITE_NAME }],
    creator: SITE_NAME,
    publisher: SITE_NAME,
    category: "shopping",
    alternates: { canonical: "/" },
    robots: indexable
      ? {
          index: true, follow: true,
          googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
        }
      : { index: false, follow: false, googleBot: { index: false, follow: false } },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      url: SITE_URL,
      title,
      description,
      images: [{ url: ogImage, width: 1200, height: 630, alt: SITE_NAME }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
      ...(twitterHandle ? { creator: twitterHandle, site: twitterHandle } : {}),
    },
    icons: {
      icon: [{ url: "/assets/favicon.png", type: "image/png" }],
      apple: "/assets/favicon.png",
    },
    manifest: "/manifest.webmanifest",
    formatDetection: { telephone: false, address: false, email: false },
    ...(verification ? { other: { "google-site-verification": verification } } : {}),
  };

  return meta;
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)",  color: "#0A0A0E" },
    { media: "(prefers-color-scheme: light)", color: "#FF7A1A" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Pull SEO settings here too so we can inject GA / FB Pixel scripts globally.
  const s = await getSiteSettings();
  const ga = s.seo_google_analytics?.trim() || "";
  const fbp = s.seo_facebook_pixel?.trim() || "";

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

        {/* Google Analytics 4 (only when configured) */}
        {ga && (
          <>
            <script async src={`https://www.googletagmanager.com/gtag/js?id=${ga}`} />
            <script
              dangerouslySetInnerHTML={{
                __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${ga}',{anonymize_ip:true});`,
              }}
            />
          </>
        )}

        {/* Facebook Pixel (only when configured) */}
        {fbp && (
          <script
            dangerouslySetInnerHTML={{
              __html: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${fbp}');fbq('track','PageView');`,
            }}
          />
        )}
      </head>
      <body className="v2">{children}</body>
    </html>
  );
}
