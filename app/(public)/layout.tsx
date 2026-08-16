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
import { buildOrganizationSchema, buildWebsiteSchema } from "@/lib/seo";

export const dynamic = "force-dynamic";

const SITE_NAME = "SubscribAI";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSiteSettings();
  const wa = normalisePhoneDigits(settings.whatsapp_number || "");
  // Entity facts (description, knowsAbout, areaServed, address) now live in
  // lib/seo.ts so every page describes the business identically.
  const orgJsonLd = buildOrganizationSchema(settings);
  const websiteJsonLd = buildWebsiteSchema(settings.business_name?.trim() || SITE_NAME);

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
