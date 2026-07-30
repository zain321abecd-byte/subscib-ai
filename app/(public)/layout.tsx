import { AuthProvider } from "@/lib/auth";
import { CartProvider } from "@/lib/cart";
import { FxProvider, type CurrencyMode } from "@/lib/fx";
import { ToastProvider } from "@/lib/toast";
import { getSiteSettings, normalisePhoneDigits } from "@/lib/site-settings";
import { getRegion, resolveCurrency } from "@/lib/region";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageProgress from "@/components/PageProgress";
import NavigationProgress from "@/components/NavigationProgress";
import RevealOnScroll from "@/components/RevealOnScroll";
import TrafficCapture from "@/components/TrafficCapture";
import { absoluteUrl, SITE_URL } from "@/lib/site-url";

export const dynamic = "force-dynamic";

const SITE_NAME = "SubscribAI";
const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: SITE_URL,
  potentialAction: {
    "@type": "SearchAction",
    target: { "@type": "EntryPoint", urlTemplate: `${absoluteUrl("/shop")}?q={search_term_string}` },
    "query-input": "required name=search_term_string",
  },
};

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSiteSettings();
  const wa = normalisePhoneDigits(settings.whatsapp_number || "");
  const socials = [
    settings.social_instagram,
    settings.social_facebook,
    settings.social_tiktok,
    settings.social_youtube,
  ].map((url) => url?.trim()).filter(Boolean);
  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: settings.business_name?.trim() || SITE_NAME,
    url: SITE_URL,
    logo: absoluteUrl("/assets/subscribai-logo.png"),
    sameAs: socials,
    contactPoint: [{
      "@type": "ContactPoint",
      contactType: "customer support",
      availableLanguage: ["en", "ur"],
      url: absoluteUrl("/contact"),
      ...(settings.contact_email ? { email: settings.contact_email } : {}),
    }],
  };

  const mode = (settings.currency_mode || "auto") as CurrencyMode;
  const [initialCurrency, region] = await Promise.all([resolveCurrency(mode), getRegion()]);
  const fxOverride = Number(settings.fx_rate_pkr_per_usd) || undefined;

  return (
    <FxProvider initialCurrency={initialCurrency} mode={mode} fxOverride={fxOverride} region={region}>
      <ToastProvider>
       <AuthProvider>
        <CartProvider>
          {/* JSON-LD lives in the body — Google indexes it either place. */}
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />
          <PageProgress />
          <NavigationProgress />
          <RevealOnScroll />
          <TrafficCapture />
          <Header mobileWhatsAppUrl={wa ? `https://wa.me/${wa}` : ""} />
          <main>{children}</main>
          <Footer />
          {/* WhatsApp FAB intentionally not global — it renders only on
              the contact page (see contact/page.tsx). */}
        </CartProvider>
       </AuthProvider>
      </ToastProvider>
    </FxProvider>
  );
}
