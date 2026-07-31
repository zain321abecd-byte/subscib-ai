import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Inter, Poppins } from "next/font/google";
import { getSiteSettings } from "@/lib/site-settings";
import { SITE_URL } from "@/lib/site-url";
import RouteLoadingIndicator from "@/components/RouteLoadingIndicator";
import "./globals.css";
import "./tailwind.css";

export const dynamic = "force-dynamic";

// `fallback` + `adjustFontFallback: false` keep the page rendering cleanly on
// networks where Google Fonts can't be reached at build time (ETIMEDOUT). Next
// will use the local fallback list instead of failing the build/page.
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--next-font-body",
  display: "swap",
  fallback: ["system-ui", "-apple-system", "Segoe UI", "Helvetica Neue", "Arial", "sans-serif"],
  adjustFontFallback: false,
});
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--next-font-heading",
  display: "swap",
  fallback: ["system-ui", "-apple-system", "Segoe UI", "Helvetica Neue", "Arial", "sans-serif"],
  adjustFontFallback: false,
});

const SITE_NAME = "SubscribAI";
const DEFAULT_DESCRIPTION =
  "Premium AI subscriptions delivered in minutes. ChatGPT Plus, Claude Pro, Midjourney, Canva, Notion AI, automation packs, and full courses.";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSiteSettings();
  const title = s.seo_site_title?.trim() || `${SITE_NAME} — Premium AI Subscriptions`;
  const description = s.seo_default_description?.trim() || DEFAULT_DESCRIPTION;
  const keywords = (s.seo_default_keywords || "").split(",").map((k) => k.trim()).filter(Boolean);
  // Default to the designed 1200×630 card rendered by app/opengraph-image.tsx;
  // the admin can still override it with the seo_og_image setting.
  const ogImage = s.seo_og_image?.trim() || "/opengraph-image";
  const twitterHandle = s.seo_twitter_handle?.trim() || "";
  const indexable = (s.seo_index_site ?? "true") !== "false";
  // Prefer canonical key, fall back to legacy alias (see KEY_ALIASES
  // in lib/site-settings). getSiteSettings() already folds them, so
  // the canonical read is usually enough.
  const verification =
    (s.google_site_verification?.trim() || s.seo_google_verification?.trim() || "");

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
    { media: "(prefers-color-scheme: dark)",  color: "#0B1019" },
    { media: "(prefers-color-scheme: light)", color: "#4884FF" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  // Required for env(safe-area-inset-*) to report real values on notched
  // phones — the header pads itself clear of the status bar with them.
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Pull SEO / tracking settings here so scripts inject globally.
  const s = await getSiteSettings();
  const ga  = (s.google_analytics_id?.trim()   || s.seo_google_analytics?.trim() || "");
  const fbp = (s.meta_pixel_id?.trim()         || s.seo_facebook_pixel?.trim()   || "");
  const gtm = s.google_tag_manager_id?.trim() || "";

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
            <Script id="ga-loader" src={`https://www.googletagmanager.com/gtag/js?id=${ga}`} strategy="afterInteractive" />
            <Script
              id="ga-config"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${ga}',{anonymize_ip:true});`,
              }}
            />
          </>
        )}

        {/* Facebook / Meta Pixel (only when configured) */}
        {fbp && (
          <Script
            id="meta-pixel"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${fbp}');fbq('track','PageView');`,
            }}
          />
        )}

        {/* Google Tag Manager — head snippet (only when configured) */}
        {gtm && (
          <Script
            id="google-tag-manager"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start': new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtm}');`,
            }}
          />
        )}
      </head>
      <body className="v2">
        {/* Google Tag Manager — noscript body fallback */}
        {gtm && (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${gtm}`}
              height="0"
              width="0"
              style={{ display: "none", visibility: "hidden" }}
              title="Google Tag Manager"
            />
          </noscript>
        )}
        {/* Meta Pixel — noscript fallback */}
        {fbp && (
          <noscript>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              height="1"
              width="1"
              alt=""
              style={{ display: "none" }}
              src={`https://www.facebook.com/tr?id=${fbp}&ev=PageView&noscript=1`}
            />
          </noscript>
        )}
        {children}
        <RouteLoadingIndicator />
      </body>
    </html>
  );
}
