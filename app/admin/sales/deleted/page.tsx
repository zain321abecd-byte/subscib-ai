import { requireAdmin } from "@/lib/admin-auth";
import { getDeletedSales, type SaleRow } from "../actions";
import DeletedSalesClient from "./DeletedSalesClient";

export const metadata = { title: "Deleted sales" };
export const dynamic = "force-dynamic";

/** Recycle bin for Daily Sales. Restoring/purging needs sales:delete. */
export default async function DeletedSalesPage() {
  const me = await requireAdmin("sales:read");
  const res = await getDeletedSales();
  const sales: SaleRow[] = res.ok ? (res.data || []) : [];

  return (
    <div style={{ padding: "24px 28px" }}>
      <DeletedSalesClient
        initialSales={sales}
        canManage={me.isSuper || me.effectivePermissions.includes("sales:delete")}
      />
    </div>
  );
}
