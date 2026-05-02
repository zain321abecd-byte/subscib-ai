import { CartProvider } from "@/lib/cart";
import { FxProvider, type CurrencyMode } from "@/lib/fx";
import { ToastProvider } from "@/lib/toast";
import { getSiteSettings } from "@/lib/site-settings";
import { getRegion, resolveCurrency } from "@/lib/region";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageProgress from "@/components/PageProgress";
import NavigationProgress from "@/components/NavigationProgress";
import RevealOnScroll from "@/components/RevealOnScroll";
import WhatsAppFab from "@/components/WhatsAppFab";
import TrafficCapture from "@/components/TrafficCapture";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://subscribai.com";
const SITE_NAME = "SubscribAI";

const orgJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/assets/subscribai-logo.png`,
  sameAs: [],
  contactPoint: [{
    "@type": "ContactPoint",
    contactType: "customer support",
    availableLanguage: ["en", "ur"],
    url: `${SITE_URL}/contact`,
  }],
  address: { "@type": "PostalAddress", addressCountry: "PK" },
};
const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: SITE_URL,
  potentialAction: {
    "@type": "SearchAction",
    target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/shop?q={search_term_string}` },
    "query-input": "required name=search_term_string",
  },
};

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSiteSettings();
  const wa = settings.whatsapp_number || "15550132026";

  const mode = (settings.currency_mode || "auto") as CurrencyMode;
  const [initialCurrency, region] = await Promise.all([resolveCurrency(mode), getRegion()]);
  const fxOverride = Number(settings.fx_rate_pkr_per_usd) || undefined;

  return (
    <FxProvider initialCurrency={initialCurrency} mode={mode} fxOverride={fxOverride} region={region}>
      <ToastProvider>
        <CartProvider>
          {/* JSON-LD lives in the body — Google indexes it either place. */}
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />
          <PageProgress />
          <NavigationProgress />
          <RevealOnScroll />
          <TrafficCapture />
          <Header />
          <main>{children}</main>
          <Footer />
          <WhatsAppFab phone={wa} />
        </CartProvider>
      </ToastProvider>
    </FxProvider>
  );
}
