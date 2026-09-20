import { requireAdmin } from "@/lib/admin-auth";
import { getSaleRequests } from "./actions";
import SaleRequestsClient from "./SaleRequestsClient";

export const metadata = { title: "Sale requests" };
export const dynamic = "force-dynamic";

/** Approval queue for product-form submissions. Reviewing needs sales:write. */
export default async function SaleRequestsPage() {
  const me = await requireAdmin("sales:read");
  const requests = await getSaleRequests();

  return (
    <div style={{ padding: "24px 28px" }}>
      <SaleRequestsClient
        initialRequests={requests}
        canReview={me.isSuper || me.effectivePermissions.includes("sales:write")}
      />
    </div>
  );
}
