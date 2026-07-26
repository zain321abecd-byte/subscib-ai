"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { BusinessInquiryButton, PlanCheckoutButton } from "./BundlePicker";
import type { PricingPlanRow } from "@/lib/supabase/types";

type BillingCycle = "monthly" | "yearly";

type FeatureRow = { label: string; values: [string | boolean, string | boolean, string | boolean]; pkOnly?: boolean };

const FALLBACK_PLANS: PricingPlanRow[] = [
  {
    id: "creator",
    name: "Creator",
    slug: "creator",
    description: "Solo creators & freelancers",
    monthly_price: 8055,
    yearly_price: 72495,
    currency: "PKR",
    features: ["2 AI subscriptions of your choice", "Prompt vault (200+ curated prompts)", "Weekly drops & tips", "Email support"],
    badge_text: "",
    button_text: "Choose Creator",
    is_popular: false,
    is_active: true,
    price_type: "fixed",
    sort_order: 10,
    created_at: "",
    updated_at: "",
  },
  {
    id: "growth",
    name: "Growth",
    slug: "growth",
    description: "Teams scaling content & ops",
    monthly_price: 16387,
    yearly_price: 147483,
    currency: "PKR",
    features: ["4 AI subscriptions of your choice", "All automation packs included", "Prompt vault + workflow library", "WhatsApp priority support"],
    badge_text: "Most popular",
    button_text: "Choose Growth",
    is_popular: true,
    is_active: true,
    price_type: "fixed",
    sort_order: 20,
    created_at: "",
    updated_at: "",
  },
  {
    id: "business",
    name: "Business",
    slug: "business",
    description: "Agencies & established teams",
    monthly_price: 0,
    yearly_price: 0,
    currency: "PKR",
    features: ["Unlimited AI subscriptions", "Custom automation builds", "Dedicated account manager", "Onboarding & training"],
    badge_text: "",
    button_text: "Custom Pricing",
    is_popular: false,
    is_active: true,
    price_type: "custom",
    sort_order: 30,
    created_at: "",
    updated_at: "",
  },
];

const COMPARE: { group: string; rows: FeatureRow[] }[] = [
  {
    group: "AI Tools",
    rows: [
      { label: "AI subscriptions included", values: ["2", "4", "Unlimited"] },
      { label: "Premium models (GPT-4, Claude, etc)", values: [true, true, true] },
      { label: "Image AI (Midjourney/Leonardo)", values: ["1 of 2", "Both", "All available"] },
      { label: "Voice AI (ElevenLabs)", values: [false, true, true] },
    ],
  },
  {
    group: "Resources",
    rows: [
      { label: "Prompt vault (200+ prompts)", values: [true, true, true] },
      { label: "Workflow library", values: [false, true, true] },
      { label: "All automation packs", values: [false, true, true] },
      { label: "Custom automation builds", values: [false, false, true] },
    ],
  },
  {
    group: "Support",
    rows: [
      { label: "Email support", values: [true, true, true] },
      { label: "WhatsApp priority support", values: [false, "<1 hour reply", "<15 min reply"] },
      { label: "Monthly office-hours call", values: [false, true, true] },
      { label: "Dedicated account manager", values: [false, false, true] },
      { label: "Onboarding & training", values: [false, false, true] },
    ],
  },
  {
    group: "Billing",
    rows: [
      { label: "Wallet & local payment options", values: [true, true, true] },
      { label: "Major credit / debit cards", values: [true, true, true] },
      { label: "Invoice billing & POs", values: [false, false, true] },
      { label: "Cancel anytime", values: [true, true, true] },
    ],
  },
];

function formatPKR(value: number) {
  return `Rs ${Number(value || 0).toLocaleString("en-PK")}`;
}

function priceForCycle(plan: PricingPlanRow, cycle: BillingCycle) {
  if (plan.price_type === "custom") return 0;
  if (cycle === "yearly") return Math.round(Number(plan.monthly_price || 0) * 12 * 0.75);
  return Number(plan.monthly_price || 0);
}

function planIcon(slug: string) {
  if (slug === "growth") return "fa-rocket";
  if (slug === "business") return "fa-building";
  return "fa-seedling";
}

export default function PricesPage() {
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [plans, setPlans] = useState<PricingPlanRow[]>(FALLBACK_PLANS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetch("/api/pricing-plans", { cache: "no-store" })
      .then((res) => res.json())
      .then((body) => {
        if (!alive) return;
        if (Array.isArray(body?.plans) && body.plans.length) setPlans(body.plans);
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => { alive = false; };
  }, []);

  const activePlans = useMemo(
    () => plans.filter((plan) => plan.is_active).sort((a, b) => a.sort_order - b.sort_order),
    [plans],
  );

  return (
    <section className="v2-section">
      <div className="v2-container">
        <header className="v2-section-head">
          <p className="v2-eyebrow">Bundles</p>
          <h2>Save more with a bundle</h2>
          <p>Admin-managed plans for creators, growing teams, and businesses. Cancel anytime.</p>
        </header>

        <div className="prices-cycle-wrap">
          <div className="prices-cycle">
            {(["monthly", "yearly"] as BillingCycle[]).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCycle(c)}
                aria-pressed={cycle === c}
                className="prices-cycle-btn"
                data-active={cycle === c ? "true" : "false"}
              >
                {c === "monthly" ? "Monthly" : "Yearly"}
              </button>
            ))}
          </div>
        </div>

        <div className="v2-pricing-grid reveal reveal-stagger">
          {activePlans.map((plan) => {
            const isCustom = plan.price_type === "custom";
            const cycleLabel = cycle === "monthly" ? "/ month" : "/ year";
            const effectivePrice = priceForCycle(plan, cycle);
            return (
              <article key={plan.id} className={`surface-card v2-tier ${plan.is_popular ? "is-featured" : ""}`}>
                {(plan.badge_text || plan.is_popular) && <span className="v2-tier-flag">{plan.badge_text || "Most popular"}</span>}
                <header>
                  <span className="v2-tier-icon"><i className={`fa-solid ${planIcon(plan.slug)}`}></i></span>
                  <h3>{plan.name}</h3>
                  <p>{plan.description}</p>
                </header>
                <div className="v2-tier-price">
                  {isCustom ? (
                    <>
                      <strong>Custom</strong>
                      <span>volume pricing</span>
                    </>
                  ) : (
                    <>
                      <strong>{formatPKR(effectivePrice)}</strong>
                      <span>{cycleLabel}</span>
                      {cycle === "yearly" && (
                        <small style={{ display: "block", color: "var(--accent-300)", fontSize: "var(--fs-xs)", fontWeight: 700, marginTop: 4 }}>
                          25% yearly discount
                        </small>
                      )}
                    </>
                  )}
                </div>
                <ul>
                  {(plan.features || []).map((feature) => <li key={feature}><i className="fa-solid fa-check"></i> {feature}</li>)}
                </ul>
                {isCustom ? (
                  <BusinessInquiryButton plan={plan} />
                ) : (
                  <PlanCheckoutButton plan={plan} cycle={cycle} primary={plan.is_popular} />
                )}
              </article>
            );
          })}
        </div>

        {loading && <p style={{ color: "var(--text-muted)", textAlign: "center", marginTop: 16 }}>Loading latest plan prices...</p>}

        <div style={{ marginTop: "var(--space-9)" }}>
          <header className="v2-section-head">
            <p className="v2-eyebrow">Compare</p>
            <h2>Plan comparison</h2>
            <p>Every feature, side by side.</p>
          </header>

          <div className="surface-card" style={{ overflow: "auto", padding: 0 }}>
            <table className="prices-table">
              <thead>
                <tr>
                  <th>Feature</th>
                  <th>Creator</th>
                  <th className="prices-th-featured">Growth</th>
                  <th>Business</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE.map((group) => (
                  <Fragment key={group.group}>
                    <tr className="prices-row-group">
                      <td colSpan={4}>{group.group}</td>
                    </tr>
                    {group.rows.map((row) => (
                      <tr key={row.label}>
                        <td data-label="Feature">{row.label}</td>
                        {row.values.map((value, index) => {
                          const tier = index === 0 ? "Creator" : index === 1 ? "Growth" : "Business";
                          return (
                            <td key={index} data-label={tier} className={index === 1 ? "prices-td-featured" : ""}>
                              {typeof value === "boolean"
                                ? value
                                  ? <i className="fa-solid fa-check" style={{ color: "var(--accent-500)" }} aria-label="Included"></i>
                                  : <span style={{ color: "var(--text-muted)" }}>-</span>
                                : <span style={{ color: "var(--text)" }}>{value}</span>}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <style>{`
        .prices-table { width: 100%; border-collapse: collapse; font-size: var(--fs-sm); }
        .prices-table th, .prices-table td {
          padding: 14px 16px; text-align: center;
          border-bottom: 1px solid var(--border);
        }
        .prices-table th { color: var(--text); font-weight: 600; background: var(--bg-elevated); position: sticky; top: 0; }
        .prices-table th:first-child, .prices-table td:first-child { text-align: left; color: var(--text-soft); }
        .prices-table th.prices-th-featured { color: var(--brand-300); background: var(--brand-soft); }
        .prices-table td.prices-td-featured { background: rgba(72, 132, 255, 0.04); }
        .prices-table .prices-row-group td {
          background: var(--surface-soft);
          color: var(--text-muted); font-weight: 600; font-size: var(--fs-xs);
          text-transform: uppercase; letter-spacing: 0.06em;
          text-align: left !important;
        }
        .prices-cycle-wrap { display: flex; justify-content: center; margin-bottom: var(--space-7); }
        .prices-cycle {
          display: inline-flex; padding: 4px;
          background: var(--surface-soft);
          border: 1px solid var(--border);
          border-radius: var(--radius-pill);
        }
        .prices-cycle-btn {
          padding: 10px 20px; border: none; cursor: pointer;
          background: transparent;
          color: var(--text-soft);
          border-radius: var(--radius-pill);
          font-weight: 600; font-size: var(--fs-sm);
          transition: background var(--dur), color var(--dur);
        }
        .prices-cycle-btn[data-active="true"] { background: var(--brand-500); color: #fff; }
        @media (max-width: 720px) {
          .prices-cycle-wrap { margin-bottom: var(--space-5); }
          .prices-cycle-btn { padding: 8px 14px; font-size: 0.82rem; }
          .prices-table thead { display: none; }
          .prices-table, .prices-table tbody { display: block; width: 100%; }
          .prices-table tr { display: grid; border-bottom: none; }
          .prices-table tr:not(.prices-row-group) {
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 8px; background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 14px; padding: 12px; margin-bottom: 10px;
          }
          .prices-table .prices-row-group {
            background: transparent; padding: 16px 2px 8px; margin-top: 10px;
          }
          .prices-table .prices-row-group td {
            background: transparent !important; padding: 0 !important; border: none !important;
            font-size: 0.7rem !important; color: var(--brand-300) !important;
          }
          .prices-table tr:not(.prices-row-group) td {
            display: grid; place-items: center; gap: 6px; min-height: 68px;
            padding: 9px 6px; border: none; border-radius: 10px;
            background: rgba(255,255,255,0.035);
            text-align: center; font-size: 0.82rem; line-height: 1.25; color: var(--text);
          }
          .prices-table tr:not(.prices-row-group) td:first-child {
            display: block; grid-column: 1 / -1; min-height: 0; background: transparent;
            border-radius: 0; text-align: left; color: var(--text); font-weight: 600;
            font-size: 0.95rem; line-height: 1.3; padding: 0 0 10px;
            border-bottom: 1px solid var(--border);
          }
          .prices-table tr:not(.prices-row-group) td:first-child::before { display: none; }
          .prices-table tr:not(.prices-row-group) td:not(:first-child)::before {
            content: attr(data-label);
            color: var(--text-muted);
            font-size: 0.62rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.06em;
          }
        }
      `}</style>
    </section>
  );
}
