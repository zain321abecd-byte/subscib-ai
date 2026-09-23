import type { Metadata } from "next";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requirePanelUser } from "@/lib/panel/auth";
import { EmptyState, LinkButton, Money, OrderBadge, PageHeader, TableWrap, Td, Th } from "@/components/panel/ui";
import type { Order } from "@/lib/panel/types";

export const metadata: Metadata = { title: "My orders" };
export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const user = await requirePanelUser();
  const db = getSupabaseAdmin();

  // Panel tables have RLS enabled with no policies, so this filter is the only
  // thing scoping the rows to the signed-in user. Never drop it.
  const { data } = await db
    .from("panel_orders")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(200);

  const orders = (data ?? []) as Order[];

  return (
    <>
      <PageHeader
        title="My orders"
        subtitle={orders.length ? `${orders.length} order${orders.length === 1 ? "" : "s"}` : undefined}
        action={<LinkButton href="/panel/orders/new">New order</LinkButton>}
      />

      {orders.length === 0 ? (
        <EmptyState
          title="No orders yet"
          body="When you place an order it appears here with its live status and how much of it has been delivered."
          action={<LinkButton href="/panel/services" variant="ghost">Browse services</LinkButton>}
        />
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <Th>Placed</Th>
              <Th>Service</Th>
              <Th>Link</Th>
              <Th align="right">Quantity</Th>
              <Th align="right">Charge</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <Td className="whitespace-nowrap text-[var(--text-muted)]">
                  {new Date(o.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                </Td>
                <Td className="font-medium text-[var(--text)]">{o.service_name}</Td>
                <Td>
                  <a href={o.link} target="_blank" rel="noopener noreferrer"
                     className="block max-w-[220px] truncate text-brand-600 hover:underline dark:text-brand-400">
                    {o.link}
                  </a>
                </Td>
                <Td align="right" className="whitespace-nowrap">{o.quantity.toLocaleString()}</Td>
                <Td align="right" className="whitespace-nowrap font-semibold text-[var(--text)]">
                  <Money value={o.charge} />
                </Td>
                <Td>
                  <OrderBadge status={o.status} />
                  {o.refunded_at && <div className="mt-1 text-xs text-[var(--text-muted)]">refunded</div>}
                </Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
    </>
  );
}
