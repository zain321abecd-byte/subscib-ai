"use client";

import Link from "next/link";
import { useState } from "react";
import { useFx } from "@/lib/fx";

type BillingCycle = "monthly" | "yearly";

type Tier = {
  icon: string;
  name: string;
  desc: string;
  /** monthly USD; yearly is auto-derived as monthly × 12 × 0.8 (20% off) */
  monthlyUsd: number | null;
  features: string[];
  cta: string;
  href: string;
  primary?: boolean;
  featured?: boolean;
};

const TIERS: Tier[] = [
  {
    icon: "fa-seedling", name: "Creator", desc: "Solo creators & freelancers", monthlyUsd: 29,
    features: [
      "2 AI subscriptions of your choice",
      "Prompt vault (200+ curated prompts)",
      "Weekly drops & tips",
      "Email support",
    ],
    cta: "Choose Creator", href: "/shop",
  },
  {
    icon: "fa-rocket", name: "Growth", desc: "Teams scaling content & ops", monthlyUsd: 59,
    features: [
      "4 AI subscriptions of your choice",
      "All automation packs included",
      "Prompt vault + workflow library",
      "WhatsApp priority support (under 1 hr)",
      "Monthly office-hours call",
    ],
    cta: "Choose Growth", href: "/shop", primary: true, featured: true,
  },
  {
    icon: "fa-building", name: "Business", desc: "Agencies & established teams", monthlyUsd: null,
    features: [
      "Unlimited AI subscriptions",
      "Custom automation builds",
      "Dedicated account manager",
      "Onboarding & training",
      "Invoice billing & purchase orders",
    ],
    cta: "Contact sales", href: "/contact",
  },
];

// What's in each tier — for the comparison table
type FeatureRow = { label: string; values: [string | boolean, string | boolean, string | boolean]; pkOnly?: boolean };
const COMPARE: { group: string; rows: FeatureRow[] }[] = [
  {
    group: "AI Tools",
    rows: [
      { label: "AI subscriptions included",           values: ["2",        "4",        "Unlimited"] },
      { label: "Premium models (GPT-4, Claude, etc)", values: [true,       true,       true] },
      { label: "Image AI (Midjourney/Leonardo)",      values: ["1 of 2",   "Both",     "All available"] },
      { label: "Voice AI (ElevenLabs)",               values: [false,     true,       true] },
    ],
  },
  {
    group: "Resources",
    rows: [
      { label: "Prompt vault (200+ prompts)",          values: [true,  true,           true] },
      { label: "Workflow library",                     values: [false, true,           true] },
      { label: "All automation packs",                 values: [false, true,           true] },
      { label: "Custom automation builds",             values: [false, false,          true] },
    ],
  },
  {
    group: "Support",
    rows: [
      { label: "Email support",                        values: [true,             true,             true] },
      { label: "WhatsApp priority support",            values: [false,            "<1 hour reply",  "<15 min reply"] },
      { label: "Monthly office-hours call",            values: [false,            true,             true] },
      { label: "Dedicated account manager",            values: [false,            false,            true] },
      { label: "Onboarding & training",                values: [false,            false,            true] },
    ],
  },
  {
    group: "Billing",
    rows: [
      { label: "Wallet & local payment options",    values: [true,  true,            true], pkOnly: true },
      { label: "Major credit / debit cards",         values: [true,  true,            true] },
      { label: "Invoice billing & POs",               values: [false, false,           true] },
      { label: "Cancel any time",                     values: [true,  true,            true] },
    ],
  },
];

function priceForCycle(monthlyUsd: number | null, cycle: BillingCycle): number | null {
  if (monthlyUsd === null) return null;
  return cycle === "yearly" ? Math.round(monthlyUsd * 12 * 0.8) : monthlyUsd;
}

export default function PricesPage() {
  const { usdToPkr, ready, region } = useFx();
  const isPK = region === "PK";
  const [cycle, setCycle] = useState<BillingCycle>("monthly");

  return (
    <section className="v2-section">
      <div className="v2-container">
        <header className="v2-section-head">
          <p className="v2-eyebrow">Bundles</p>
          <h2>Save more with a bundle</h2>
          <p>Pre-mixed packs for creators, growing teams, and businesses. Cancel any time.</p>
        </header>

        {/* Billing-cycle toggle */}
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
                {c === "yearly" && (
                  <span className="prices-cycle-save" data-active={cycle === c ? "true" : "false"}>SAVE 20%</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tier cards */}
        <div className="v2-pricing-grid reveal reveal-stagger">
          {TIERS.map((t) => {
            const usd = priceForCycle(t.monthlyUsd, cycle);
            const pkr = usd !== null ? Math.round(usd * usdToPkr).toLocaleString("en-PK") : null;
            const cycleLabel = cycle === "monthly" ? "/ month" : "/ year";
            return (
              <article key={t.name} className={`surface-card v2-tier ${t.featured ? "is-featured" : ""}`}>
                {t.featured && <span className="v2-tier-flag">Most popular</span>}
                <header>
                  <span className="v2-tier-icon"><i className={`fa-solid ${t.icon}`}></i></span>
                  <h3>{t.name}</h3>
                  <p>{t.desc}</p>
                </header>
                <div className="v2-tier-price">
                  {usd !== null ? (
                    <>
                      {isPK ? (
                        <>
                          <strong>{ready ? `Rs ${pkr}` : "—"}</strong>
                          <span>{cycleLabel}</span>
                        </>
                      ) : (
                        <>
                          <strong>${usd}</strong>
                          <span>{cycleLabel}</span>
                        </>
                      )}
                      {cycle === "yearly" && t.monthlyUsd && (
                        <div style={{ marginTop: 4, color: "var(--accent-300)", fontSize: "var(--fs-xs)", fontWeight: 600 }}>
                          {isPK
                            ? (ready ? `You save Rs ${Math.round(t.monthlyUsd * 12 * 0.2 * usdToPkr).toLocaleString("en-PK")} a year` : "Save 20% yearly")
                            : `You save $${Math.round(t.monthlyUsd * 12 * 0.2)} a year`}
                        </div>
                      )}
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

        {/* Comparison table */}
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
                  <>
                    <tr key={`g-${group.group}`} className="prices-row-group">
                      <td colSpan={4}>{group.group}</td>
                    </tr>
                    {group.rows.filter((row) => !row.pkOnly || isPK).map((row) => (
                      <tr key={row.label}>
                        <td data-label="Feature">{row.label}</td>
                        {row.values.map((v, i) => {
                          const tier = i === 0 ? "Creator" : i === 1 ? "Growth" : "Business";
                          return (
                            <td key={i} data-label={tier} className={i === 1 ? "prices-td-featured" : ""}>
                              {typeof v === "boolean"
                                ? v
                                  ? <i className="fa-solid fa-check" style={{ color: "var(--accent-500)" }} aria-label="Included"></i>
                                  : <span style={{ color: "var(--text-muted)" }}>—</span>
                                : <span style={{ color: "var(--text)" }}>{v}</span>
                              }
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </>
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
        .prices-table td.prices-td-featured { background: rgba(255, 122, 26, 0.04); }
        .prices-table .prices-row-group td {
          background: var(--surface-soft);
          color: var(--text-muted); font-weight: 600; font-size: var(--fs-xs);
          text-transform: uppercase; letter-spacing: 0.06em;
          text-align: left !important;
        }

        /* Billing-cycle toggle */
        .prices-cycle-wrap {
          display: flex; justify-content: center;
          margin-bottom: var(--space-7);
        }
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
          display: inline-flex; align-items: center; gap: 8px;
        }
        .prices-cycle-btn[data-active="true"] {
          background: var(--brand-500);
          color: #fff;
        }
        .prices-cycle-save {
          padding: 2px 8px;
          background: var(--accent-soft);
          color: var(--accent-300);
          border-radius: var(--radius-pill);
          font-size: var(--fs-xs); font-weight: 700;
          letter-spacing: 0.02em;
        }
        .prices-cycle-save[data-active="true"] {
          background: rgba(255,255,255,0.20);
          color: #fff;
        }

        /* ---------- Mobile (≤720px) ---------- */
        @media (max-width: 720px) {
          .prices-cycle-wrap { margin-bottom: var(--space-5); }
          .prices-cycle-btn {
            padding: 8px 14px;
            font-size: 0.82rem;
            gap: 6px;
          }
          .prices-cycle-save {
            padding: 2px 7px;
            font-size: 0.62rem;
          }

          /* Comparison table → stacked cards */
          .prices-table thead { display: none; }
          .prices-table, .prices-table tbody { display: block; width: 100%; }
          .prices-table tr {
            display: block;
            border-bottom: none;
          }
          .prices-table tr:not(.prices-row-group) {
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 12px 14px;
            margin-bottom: 8px;
          }
          .prices-table .prices-row-group {
            background: transparent;
            padding: 14px 4px 6px;
            margin-top: 8px;
          }
          .prices-table .prices-row-group td {
            background: transparent !important;
            padding: 0 !important;
            border: none !important;
            font-size: 0.7rem !important;
            color: var(--brand-300) !important;
          }
          .prices-table tr:not(.prices-row-group) td {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 12px;
            padding: 8px 0;
            border: none;
            text-align: right;
            font-size: 0.86rem;
          }
          .prices-table tr:not(.prices-row-group) td:first-child {
            display: block;
            text-align: left;
            color: var(--text);
            font-weight: 600;
            font-size: 0.92rem;
            padding: 0 0 8px;
            margin-bottom: 6px;
            border-bottom: 1px solid var(--border);
          }
          .prices-table tr:not(.prices-row-group) td:first-child::before { display: none; }
          .prices-table tr:not(.prices-row-group) td:not(:first-child)::before {
            content: attr(data-label);
            color: var(--text-muted);
            font-size: 0.78rem;
            font-weight: 500;
            text-align: left;
            margin-right: auto;
            text-transform: uppercase;
            letter-spacing: 0.04em;
          }
          .prices-table td.prices-td-featured {
            background: transparent !important;
          }
          .prices-table td.prices-td-featured::before {
            color: var(--brand-300) !important;
          }
        }
      `}</style>
    </section>
  );
}
