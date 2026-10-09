import type { Metadata } from "next";
import { FxProvider, type CurrencyMode } from "@/lib/fx";
import { getRegion, resolveCurrency } from "@/lib/region";
import { getSiteSettings } from "@/lib/site-settings";
import "../panel.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Panel", template: "%s · SubscribAI Panel" },
  description: "SubscribAI SMM Panel for social media services, order tracking, payments, and support.",
  alternates: { canonical: "/panel" },
  robots: { index: true, follow: true },
};

/**
 * Outermost /panel layout.
 *
 * It holds only the things every panel route needs, signed in or not: the
 * stylesheet, the theme bootstrap, and the `.panel-scope` wrapper that carries
 * the panel's surface tokens and the scoped reset. The sign-in page renders
 * inside this too, which is why the session check isn't here — it's in
 * (dash)/layout.tsx, one level down.
 *
 * The public /panel landing page is indexable. Private dashboard and sign-in
 * routes override this metadata with noindex in their own route segments.
 */
export default async function PanelRootLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSiteSettings();
  const mode = (settings.currency_mode || "auto") as CurrencyMode;
  const [initialCurrency, region] = await Promise.all([resolveCurrency(mode), getRegion()]);
  const fxOverride = Number(settings.fx_rate_pkr_per_usd) || undefined;

  return (
    <FxProvider initialCurrency={initialCurrency} mode={mode} fxOverride={fxOverride} region={region}>
      <div className="panel-scope min-h-dvh">
      {/*
        Applies the stored theme before first paint. Without this the page
        renders light and then flips, which is worse than no dark mode at all.
        Kept inline and tiny for that reason — it has to run before the body
        is painted, so it can't be a module.
      */}
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){try{var t=localStorage.getItem("panel-theme");if(t==="dark"||(!t&&window.matchMedia("(prefers-color-scheme:dark)").matches)){document.documentElement.classList.add("dark")}}catch(e){}})();`,
        }}
      />
        {children}
      </div>
    </FxProvider>
  );
}
