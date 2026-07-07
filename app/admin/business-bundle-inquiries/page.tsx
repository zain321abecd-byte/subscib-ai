import { requireAdmin } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { BusinessBundleInquiryRow } from "@/lib/supabase/types";
import BusinessBundleInquiriesClient from "./BusinessBundleInquiriesClient";

export const metadata = { title: "Business Bundle Inquiries · Admin" };
export const dynamic = "force-dynamic";

export default async function BusinessBundleInquiriesPage() {
  const me = await requireAdmin("orders:read");

  const { data, error } = await getSupabaseAdmin()
    .from("business_bundle_inquiries")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(300);

  const canWrite = me.isSuper || me.effectivePermissions.includes("orders:write");

  return (
    <>
      <header className="admin-page-head">
        <div>
          <h1>Business Bundle Inquiries</h1>
          <p>Review Contact Sales submissions for custom business bundles.</p>
        </div>
      </header>

      {error && (
        <div className="admin-card" style={{ background: "rgba(239,68,68,0.10)", borderColor: "rgba(239,68,68,0.30)", color: "#fca5a5", marginBottom: 14 }}>
          {error.message}
        </div>
      )}

      <BusinessBundleInquiriesClient
        inquiries={(data ?? []) as BusinessBundleInquiryRow[]}
        canWrite={canWrite}
      />
    </>
  );
}
