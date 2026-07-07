import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { PricingPlanRow } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

type BillingCycle = "monthly" | "yearly";

function validCycle(value: unknown): value is BillingCycle {
  return value === "monthly" || value === "yearly";
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid checkout plan request." }, { status: 400 });
  }

  const planId = typeof body.planId === "string" ? body.planId.trim() : "";
  const billingCycle = validCycle(body.billingCycle) ? body.billingCycle : null;

  if (!planId || !billingCycle) {
    return NextResponse.json({ error: "Plan and billing cycle are required." }, { status: 400 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from("pricing_plans")
    .select("*")
    .eq("id", planId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Selected plan is not available." }, { status: 404 });
  }

  const plan = data as PricingPlanRow;
  if (plan.price_type === "custom") {
    return NextResponse.json({ error: "Custom plans require contacting sales." }, { status: 400 });
  }

  const price = billingCycle === "monthly" ? plan.monthly_price : plan.yearly_price;
  if (!Number.isFinite(Number(price)) || Number(price) <= 0) {
    return NextResponse.json({ error: "Selected plan does not have a valid price." }, { status: 400 });
  }

  return NextResponse.json({
    item: {
      id: `pricing-plan-${plan.slug}-${billingCycle}`,
      name: plan.name,
      price: Number(price),
      qty: 1,
      variation: {
        accountType: "bundle",
        accountLabel: plan.name,
        duration: billingCycle,
        summary: `${plan.name} · ${billingCycle === "monthly" ? "Monthly" : "Yearly"} · Rs ${Number(price).toLocaleString("en-PK")}`,
        pricingPlan: {
          planId: plan.id,
          slug: plan.slug,
          name: plan.name,
          billingCycle,
          currency: plan.currency,
        },
      },
    },
  });
}
