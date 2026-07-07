"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart";
import type { PricingPlanRow } from "@/lib/supabase/types";

type BillingCycle = "monthly" | "yearly";

function formatPKR(value: number) {
  return `Rs ${Number(value || 0).toLocaleString("en-PK")}`;
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
  const price = cycle === "monthly" ? plan.monthly_price : plan.yearly_price;

  function continueToCheckout() {
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
        summary: `${plan.name} · ${cycle === "monthly" ? "Monthly" : "Yearly"} · ${formatPKR(price)}`,
        pricingPlan: {
          planId: plan.id,
          slug: plan.slug,
          name: plan.name,
          billingCycle: cycle,
          currency: plan.currency,
        },
      },
    });
    router.push("/checkout");
  }

  return (
    <button type="button" className={`btn ${primary ? "btn-primary" : "btn-outline"}`} onClick={continueToCheckout}>
      {plan.button_text || (plan.slug === "growth" ? "Choose Growth" : "Choose Creator")}
    </button>
  );
}

export function BusinessInquiryButton({ plan }: { plan: PricingPlanRow }) {
  return (
    <Link href="/custom-pricing" className="btn btn-outline">
      {plan.button_text || "Custom Pricing"}
    </Link>
  );
}
