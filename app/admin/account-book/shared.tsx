import { requireAdmin } from "@/lib/admin-auth";
import { getPayables, getReceivables } from "./actions";
import AccountBookClient, { type Ledger } from "./AccountBookClient";

/** All three account-book routes render this with a different starting tab. */
export default async function AccountBookPage({ tab }: { tab: Ledger }) {
  const me = await requireAdmin("accounts:read");
  const [payables, receivables] = await Promise.all([getPayables(), getReceivables()]);

  return (
    <div style={{ padding: "24px 28px" }}>
      <AccountBookClient
        payables={payables}
        receivables={receivables}
        initialTab={tab}
        canWrite={me.isSuper || me.effectivePermissions.includes("accounts:write")}
      />
    </div>
  );
}
