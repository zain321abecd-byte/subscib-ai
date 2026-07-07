import { requireAdmin } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { OrderRow } from "@/lib/supabase/types";
import BundleOrdersClient from "./BundleOrdersClient";

export const metadata = { title: "Bundle Orders · Admin" };
export const dynamic = "force-dynamic";

export default async function BundleOrdersPage() {
  const me = await requireAdmin("orders:read");

  const ordersRes = await getSupabaseAdmin()
    .from("orders")
    .select("*")
    .eq("package_tier", "bundle")
    .order("created_at", { ascending: false })
    .limit(300);

  const canWrite = me.isSuper || me.effectivePermissions.includes("orders:write");

  return (
    <>
      <header className="admin-page-head">
        <div>
          <h1>Bundle Orders</h1>
          <p>Manage Creator/Growth checkout orders from fixed bundle plans.</p>
        </div>
      </header>

      {ordersRes.error && (
        <div className="admin-card" style={{ background: "rgba(239,68,68,0.10)", borderColor: "rgba(239,68,68,0.30)", color: "#fca5a5", marginBottom: 14 }}>
          {ordersRes.error.message}
        </div>
      )}

      <BundleOrdersClient
        initialOrders={(ordersRes.data ?? []) as OrderRow[]}
        canWrite={canWrite}
      />
    </>
  );
}
