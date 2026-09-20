import { requireAdmin } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { SITE_URL } from "@/lib/site-url";
import { getFormRequestCounts, getProductForms } from "./actions";
import ProductFormsClient from "./ProductFormsClient";

export const metadata = { title: "Product forms" };
export const dynamic = "force-dynamic";

/** Form management. Viewing needs products:read, editing products:write. */
export default async function ProductFormsPage() {
  const me = await requireAdmin("products:read");

  const [forms, counts, productsRes] = await Promise.all([
    getProductForms(),
    getFormRequestCounts(),
    getSupabaseAdmin().from("products").select("id, name, price").order("name", { ascending: true }),
  ]);

  return (
    <div style={{ padding: "24px 28px" }}>
      <ProductFormsClient
        initialForms={forms}
        products={(productsRes.data as Array<{ id: string; name: string; price: number }> | null) ?? []}
        counts={counts}
        origin={SITE_URL}
        canWrite={me.isSuper || me.effectivePermissions.includes("products:write")}
        canDelete={me.isSuper || me.effectivePermissions.includes("products:delete")}
      />
    </div>
  );
}
