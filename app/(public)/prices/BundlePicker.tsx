"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useCart } from "@/lib/cart";
import type { PricingPlanRow } from "@/lib/supabase/types";

type BillingCycle = "monthly" | "yearly";

const BUNDLE_TOOLS = [
  "ChatGPT",
  "Claude",
  "Gemini",
  "Grok",
  "Canva",
  "CapCut",
  "ElevenLabs",
  "Perplexity",
  "Semrush",
  "Heygen",
  "Veo",
];

function formatPKR(value: number) {
  return `Rs ${Number(value || 0).toLocaleString("en-PK")}`;
}

function planLimit(slug: string) {
  return slug === "growth" ? 4 : 2;
}

function displayPrice(plan: PricingPlanRow, cycle: BillingCycle) {
  if (cycle === "yearly") return Math.round(Number(plan.monthly_price || 0) * 12 * 0.75);
  return Number(plan.monthly_price || 0);
}

export function PlanCheckoutButton({
  plan,
  cycle,
  primary,
}: {
  plan: PricingPlanRow;
  cycle: BillingCycle;
  primary?: boolean;
}) {
  const router = useRouter();
  const cart = useCart();
  const [open, setOpen] = useState(false);
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const limit = planLimit(plan.slug);
  const price = displayPrice(plan, cycle);
  const canContinue = selectedTools.length === limit;

  const summary = useMemo(() => {
    const cycleLabel = cycle === "monthly" ? "Monthly" : "Yearly";
    return `${plan.name} · ${cycleLabel} · ${selectedTools.join(", ")} · ${formatPKR(price)}`;
  }, [cycle, plan.name, price, selectedTools]);

  function toggleTool(tool: string) {
    setSelectedTools((current) => {
      if (current.includes(tool)) return current.filter((item) => item !== tool);
      if (current.length >= limit) return current;
      return [...current, tool];
    });
  }

  function continueToCheckout() {
    if (!canContinue) return;
    cart.clear();
    cart.add({
      id: `pricing-plan-${plan.slug}-${cycle}`,
      name: plan.name,
      price,
      qty: 1,
      iconClass: plan.slug === "growth" ? "fa-rocket" : "fa-seedling",
      variation: {
        accountType: "bundle",
        accountLabel: plan.name,
        duration: cycle,
        summary,
        pricingPlan: {
          planId: plan.id,
          slug: plan.slug,
          name: plan.name,
          billingCycle: cycle,
          currency: plan.currency,
        },
        bundle: {
          key: plan.slug === "growth" ? "growth" : "creator",
          name: plan.name,
          billingCycle: cycle,
          selectedTools,
          toolLimit: limit,
        },
      },
    });
    router.push("/checkout");
  }

  return (
    <>
      <button type="button" className={`btn ${primary ? "btn-primary" : "btn-outline"}`} onClick={() => setOpen(true)}>
        {plan.button_text || (plan.slug === "growth" ? "Choose Growth" : "Choose Creator")}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={`bundle-picker-${plan.slug}`}
          className="bundle-picker-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div className="surface-card bundle-picker-modal">
            <div className="bundle-picker-head">
              <div>
                <p className="v2-eyebrow">Select your tools</p>
                <h3 id={`bundle-picker-${plan.slug}`}>{plan.name} bundle</h3>
                <p>Choose exactly {limit} tools. Your team will activate these after checkout.</p>
              </div>
              <button type="button" className="bundle-picker-close" onClick={() => setOpen(false)} aria-label="Close tool selection">
                <i className="fa-solid fa-xmark" aria-hidden="true" />
              </button>
            </div>

            <div className="bundle-picker-count" aria-live="polite">
              {selectedTools.length} / {limit} selected
            </div>

            <div className="bundle-tool-grid">
              {BUNDLE_TOOLS.map((tool) => {
                const checked = selectedTools.includes(tool);
                const disabled = !checked && selectedTools.length >= limit;
                return (
                  <button
                    key={tool}
                    type="button"
                    className={`bundle-tool ${checked ? "is-selected" : ""}`}
                    disabled={disabled}
                    onClick={() => toggleTool(tool)}
                    aria-pressed={checked}
                  >
                    <span className="bundle-tool-check">
                      {checked ? <i className="fa-solid fa-check" aria-hidden="true" /> : null}
                    </span>
                    <span>{tool}</span>
                  </button>
                );
              })}
            </div>

            <div className="bundle-picker-summary">
              <div>
                <strong>{formatPKR(price)}</strong>
                <span>{cycle === "monthly" ? "Monthly" : "Yearly with 25% discount"}</span>
              </div>
              <p>{selectedTools.length > 0 ? selectedTools.join(", ") : `Select ${limit} tools to continue.`}</p>
            </div>

            <div className="bundle-picker-actions">
              <button type="button" className="btn btn-outline" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" disabled={!canContinue} onClick={continueToCheckout}>
                Continue to Checkout <i className="fa-solid fa-arrow-right" aria-hidden="true" />
              </button>
            </div>
          </div>

          <style jsx>{`
            .bundle-picker-backdrop {
              position: fixed;
              inset: 0;
              z-index: 80;
              display: grid;
              place-items: center;
              padding: 18px;
              background: rgba(0, 0, 0, 0.62);
            }
            .bundle-picker-modal {
              width: min(760px, 100%);
              max-height: 90vh;
              overflow: auto;
            }
            .bundle-picker-head {
              display: flex;
              align-items: flex-start;
              justify-content: space-between;
              gap: 16px;
              margin-bottom: 16px;
            }
            .bundle-picker-head h3 {
              margin: 0;
              color: var(--text);
              font-family: var(--font-heading);
              font-size: var(--fs-2xl);
            }
            .bundle-picker-head p:not(.v2-eyebrow) {
              margin: 6px 0 0;
              color: var(--text-muted);
            }
            .bundle-picker-close {
              width: 38px;
              height: 38px;
              border: 1px solid var(--border);
              border-radius: 10px;
              background: var(--surface-2);
              color: var(--text);
              cursor: pointer;
              flex-shrink: 0;
            }
            .bundle-picker-count {
              display: inline-flex;
              margin-bottom: 14px;
              padding: 6px 10px;
              border-radius: var(--radius-pill);
              background: var(--brand-soft);
              color: var(--brand-300);
              font-size: var(--fs-sm);
              font-weight: 700;
            }
            .bundle-tool-grid {
              display: grid;
              grid-template-columns: repeat(3, minmax(0, 1fr));
              gap: 10px;
            }
            .bundle-tool {
              min-height: 48px;
              display: flex;
              align-items: center;
              gap: 10px;
              border: 1px solid var(--border);
              border-radius: 10px;
              background: var(--surface-2);
              color: var(--text);
              cursor: pointer;
              padding: 10px 12px;
              font-weight: 650;
              text-align: left;
            }
            .bundle-tool.is-selected {
              border-color: rgba(255, 122, 26, 0.65);
              background: rgba(255, 122, 26, 0.12);
            }
            .bundle-tool:disabled {
              opacity: 0.45;
              cursor: not-allowed;
            }
            .bundle-tool-check {
              width: 22px;
              height: 22px;
              border-radius: 999px;
              border: 1px solid var(--border);
              display: grid;
              place-items: center;
              color: #fff;
              background: var(--surface);
              flex-shrink: 0;
            }
            .bundle-tool.is-selected .bundle-tool-check {
              border-color: var(--brand-500);
              background: var(--brand-500);
            }
            .bundle-picker-summary {
              margin-top: 16px;
              padding: 14px;
              border: 1px solid var(--border);
              border-radius: 12px;
              background: var(--surface-2);
            }
            .bundle-picker-summary strong {
              display: block;
              color: var(--text);
              font-family: var(--font-heading);
              font-size: var(--fs-xl);
            }
            .bundle-picker-summary span,
            .bundle-picker-summary p {
              color: var(--text-muted);
              font-size: var(--fs-sm);
            }
            .bundle-picker-summary p {
              margin: 8px 0 0;
            }
            .bundle-picker-actions {
              display: flex;
              justify-content: flex-end;
              gap: 10px;
              margin-top: 16px;
            }
            @media (max-width: 680px) {
              .bundle-tool-grid { grid-template-columns: 1fr; }
              .bundle-picker-actions { flex-direction: column; }
              .bundle-picker-actions .btn { width: 100%; justify-content: center; }
            }
          `}</style>
        </div>
      )}
    </>
  );
}

export function BusinessInquiryButton({ plan }: { plan: PricingPlanRow }) {
  return (
    <Link href="/business-bundle-inquiry" className="btn btn-outline">
      {plan.button_text || "Custom Pricing"}
    </Link>
  );
}
