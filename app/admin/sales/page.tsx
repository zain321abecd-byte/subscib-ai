import { requireAdmin } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSubscriptionSales, type SaleRow } from "./actions";
import SalesClient from "./SalesClient";

export const metadata = { title: "Daily sales · Admin" };
export const dynamic = "force-dynamic";

/**
 * Server-rendered entry point. Gates on `sales:read`, loads the sale
 * list + the product catalog (used to populate the "product" dropdown
 * in the new-sale modal), then hands both off to the client component.
 */
export default async function SalesPage() {
  const me = await requireAdmin("sales:read");

  const [salesRes, productsRes] = await Promise.all([
    getSubscriptionSales(),
    getSupabaseAdmin().from("products").select("id, name, price").order("name", { ascending: true }),
  ]);

  const sales: SaleRow[] = salesRes.ok ? (salesRes.data || []) : [];
  const products = (productsRes.data as Array<{ id: string; name: string; price: number }> | null) || [];
  const loadError = !salesRes.ok ? salesRes.error : (productsRes.error?.message ?? null);

  const canWrite  = me.isSuper || me.effectivePermissions.includes("sales:write");
  const canDelete = me.isSuper || me.effectivePermissions.includes("sales:delete");

  return (
    <div style={{ padding: "24px 28px" }}>
      <SalesClient
        initialSales={sales}
        products={products}
        canWrite={canWrite}
        canDelete={canDelete}
        loadError={loadError}
      />
    </div>
  );
}
