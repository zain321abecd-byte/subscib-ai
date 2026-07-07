import { requireAdmin } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { CustomPricingRequestRow } from "@/lib/supabase/types";
import CustomPricingRequestsClient from "./CustomPricingRequestsClient";

export const metadata = { title: "Custom Pricing Requests · Admin" };
export const dynamic = "force-dynamic";

export default async function CustomPricingRequestsPage() {
  const me = await requireAdmin("orders:read");

  const { data, error } = await getSupabaseAdmin()
    .from("custom_pricing_requests")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(300);

  const canWrite = me.isSuper || me.effectivePermissions.includes("orders:write");

  return (
    <>
      <header className="admin-page-head">
        <div>
          <h1>Custom Pricing Requests</h1>
          <p>Review business custom pricing requests and track team follow-up.</p>
        </div>
      </header>

      {error && (
        <div className="admin-card" style={{ background: "rgba(239,68,68,0.10)", borderColor: "rgba(239,68,68,0.30)", color: "#fca5a5", marginBottom: 14 }}>
          {error.message}
        </div>
      )}

      <CustomPricingRequestsClient requests={(error ? [] : data ?? []) as CustomPricingRequestRow[]} canWrite={canWrite} />
    </>
  );
}
