"use client";

import Link from "next/link";
import { useFx } from "@/lib/fx";

const TIERS = [
  {
    icon: "fa-seedling", name: "Creator", desc: "Solo creators & freelancers", priceUsd: 29,
    features: ["2 AI subscriptions of choice", "Prompt vault (200+)", "Weekly drops & tips", "Email support"],
    cta: "Choose Creator", href: "/shop", primary: false,
  },
  {
    icon: "fa-rocket", name: "Growth", desc: "Teams scaling content & ops", priceUsd: 59,
    features: ["4 AI subscriptions of choice", "All automation packs", "Prompt vault + workflow library", "WhatsApp priority support", "Monthly office-hours call"],
    cta: "Choose Growth", href: "/shop", primary: true, featured: true,
  },
  {
    icon: "fa-building", name: "Business", desc: "Agencies & established teams", priceUsd: null as number | null,
    features: ["Unlimited AI subscriptions", "Custom automation builds", "Dedicated account manager", "Onboarding & training", "Invoice billing"],
    cta: "Contact sales", href: "/contact", primary: false,
  },
];

export default function PricesPage() {
  const { usdToPkr, ready } = useFx();
  return (
    <section className="v2-section">
      <div className="v2-container">
        <header className="v2-section-head">
          <p className="v2-eyebrow">Bundles</p>
          <h2>Save more with a bundle</h2>
          <p>Pre-mixed packs for creators, growing teams, and businesses. Cancel any time. Prices shown in USD with PKR conversion.</p>
        </header>
        <div className="v2-pricing-grid reveal reveal-stagger">
          {TIERS.map((t) => {
            const pkr = t.priceUsd ? Math.round(t.priceUsd * usdToPkr).toLocaleString("en-PK") : null;
            return (
              <article key={t.name} className={`surface-card v2-tier ${t.featured ? "is-featured" : ""}`}>
                {t.featured && <span className="v2-tier-flag">Most popular</span>}
                <header>
                  <span className="v2-tier-icon"><i className={`fa-solid ${t.icon}`}></i></span>
                  <h3>{t.name}</h3>
                  <p>{t.desc}</p>
                </header>
                <div className="v2-tier-price">
                  {t.priceUsd ? (
                    <>
                      <strong>${t.priceUsd}</strong>
                      <span>/ month</span>
                      {ready && <div style={{ marginTop: 4, color: "var(--text-muted)", fontSize: "var(--fs-sm)" }}>≈ Rs {pkr} / month</div>}
                    </>
                  ) : (
                    <>
                      <strong>Custom</strong>
                      <span>volume pricing</span>
                    </>
                  )}
                </div>
                <ul>
                  {t.features.map((f) => <li key={f}><i className="fa-solid fa-check"></i> {f}</li>)}
                </ul>
                <Link className={`btn ${t.primary ? "btn-primary" : "btn-outline"}`} href={t.href}>{t.cta}</Link>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
