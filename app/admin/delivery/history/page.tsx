import { requireAdmin } from "@/lib/admin-auth";
import { getDeliveryHistory } from "../actions";
import HistoryClient from "./HistoryClient";

export const metadata = { title: "Delivery history" };
export const dynamic = "force-dynamic";

/** Delivery log. Read needs `delivery:read`; resend needs `delivery:send`. */
export default async function DeliveryHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const me = await requireAdmin("delivery:read");
  const { order } = await searchParams;
  const messages = await getDeliveryHistory({ limit: 200, orderId: order });

  return (
    <div style={{ padding: "24px 28px" }}>
      <HistoryClient
        initialMessages={messages}
        canSend={me.isSuper || me.effectivePermissions.includes("delivery:send")}
      />
    </div>
  );
}
