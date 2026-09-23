import type { Metadata } from "next";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requirePanelUser } from "@/lib/panel/auth";
import { EmptyState, Money, PageHeader, PaymentBadge, Stat, TableWrap, Td, Th } from "@/components/panel/ui";
import type { PaymentRequest } from "@/lib/panel/types";
import TopUpForm from "./TopUpForm";

export const metadata: Metadata = { title: "Add funds" };
export const dynamic = "force-dynamic";

export default async function WalletPage() {
  const user = await requirePanelUser();
  const db = getSupabaseAdmin();

  const [{ data: wallet }, { data: requests }] = await Promise.all([
    db.from("panel_wallets").select("balance, currency").eq("user_id", user.id).maybeSingle(),
    db.from("panel_payment_requests").select("*").eq("user_id", user.id)
      .order("created_at", { ascending: false }).limit(50),
  ]);

  const currency = wallet?.currency ?? "PKR";
  const list = (requests ?? []) as PaymentRequest[];
  const pending = list.filter((r) => r.status === "pending");

  return (
    <>
      <PageHeader title="Add funds" subtitle="Top up your wallet so you can place orders." />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Stat label="Current balance" value={`${Number(wallet?.balance ?? 0).toLocaleString("en-PK", { minimumFractionDigits: 2 })} ${currency}`} />
        <Stat label="Awaiting approval" value={pending.length} hint={pending.length ? "An admin is reviewing" : undefined} />
        <Stat
          label="Pending value"
          value={`${pending.reduce((a, r) => a + Number(r.amount), 0).toLocaleString("en-PK", { minimumFractionDigits: 2 })} ${currency}`}
        />
      </div>

      <div className="grid gap-5 md:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <TopUpForm currency={currency} />

        <div>
          <h2 className="mb-2 text-sm font-bold text-[var(--text)]">Your top-up requests</h2>
          {list.length === 0 ? (
            <EmptyState title="No requests yet" body="Submit the form and your request appears here with its status." />
          ) : (
            <TableWrap>
              <thead>
                <tr>
                  <Th>Date</Th>
                  <Th align="right">Amount</Th>
                  <Th>Method</Th>
                  <Th>Reference</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {list.map((r) => (
                  <tr key={r.id}>
                    <Td className="whitespace-nowrap text-[var(--text-muted)]">
                      {new Date(r.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                    </Td>
                    <Td align="right" className="whitespace-nowrap font-semibold text-[var(--text)]">
                      <Money value={r.amount} currency={currency} />
                    </Td>
                    <Td className="capitalize text-[var(--text-muted)]">{r.method}</Td>
                    <Td className="text-[var(--text-muted)]">{r.reference || "—"}</Td>
                    <Td>
                      <PaymentBadge status={r.status} />
                      {r.admin_note && <div className="mt-1 max-w-[200px] text-xs text-[var(--text-muted)]">{r.admin_note}</div>}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          )}
        </div>
      </div>
    </>
  );
}
