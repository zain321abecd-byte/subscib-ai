import { requireAdmin } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { PricingPlanRow } from "@/lib/supabase/types";
import PricingPlansClient from "./PricingPlansClient";

export const metadata = { title: "Pricing Plans · Admin" };
export const dynamic = "force-dynamic";

export default async function PricingPlansPage() {
  const me = await requireAdmin("settings:read");
  const { data, error } = await getSupabaseAdmin()
    .from("pricing_plans")
    .select("*")
    .order("sort_order", { ascending: true });

  const canWrite = me.isSuper || me.effectivePermissions.includes("settings:write");

  return (
    <>
      <header className="admin-page-head">
        <div>
          <h1>Pricing Plans</h1>
          <p>Manage public plan names, monthly/yearly prices, features, badges, and visibility.</p>
        </div>
      </header>

      {error && (
        <div className="admin-card" style={{ background: "rgba(239,68,68,0.10)", borderColor: "rgba(239,68,68,0.30)", color: "#fca5a5", marginBottom: 14 }}>
          {error.message}
        </div>
      )}

      <PricingPlansClient plans={(data ?? []) as PricingPlanRow[]} canWrite={canWrite} />
    </>
  );
}
