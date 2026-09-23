import type { Metadata } from "next";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requirePanelUser } from "@/lib/panel/auth";
import { Badge, EmptyState, LinkButton, Money, PageHeader, TableWrap, Td, Th } from "@/components/panel/ui";
import type { WalletTransaction } from "@/lib/panel/types";

export const metadata: Metadata = { title: "Transactions" };
export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  const user = await requirePanelUser();
  const db = getSupabaseAdmin();

  const [{ data }, { data: wallet }] = await Promise.all([
    db.from("panel_wallet_transactions").select("*").eq("user_id", user.id)
      .order("created_at", { ascending: false }).limit(300),
    db.from("panel_wallets").select("currency").eq("user_id", user.id).maybeSingle(),
  ]);

  const rows = (data ?? []) as WalletTransaction[];
  const currency = wallet?.currency ?? "PKR";

  return (
    <>
      <PageHeader
        title="Transactions"
        subtitle="Every credit and debit, with the balance after each one."
        action={<LinkButton href="/panel/wallet" variant="ghost">Add funds</LinkButton>}
      />

      {rows.length === 0 ? (
        <EmptyState
          title="No transactions yet"
          body="Top-ups and order charges will be listed here. The running balance makes each statement reconstructable."
        />
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <Th>Date</Th>
              <Th>Type</Th>
              <Th>Detail</Th>
              <Th align="right">Amount</Th>
              <Th align="right">Balance after</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id}>
                <Td className="whitespace-nowrap text-[var(--text-muted)]">
                  {new Date(t.created_at).toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </Td>
                <Td><Badge tone={t.type === "credit" ? "ok" : "warn"}>{t.type}</Badge></Td>
                <Td className="text-[var(--text)]">{t.note || t.reference || "—"}</Td>
                <Td align="right" className="whitespace-nowrap font-semibold text-[var(--text)]">
                  {t.type === "credit" ? "+" : "−"}
                  {Number(t.amount).toLocaleString("en-PK", { minimumFractionDigits: 2 })}
                </Td>
                <Td align="right" className="whitespace-nowrap text-[var(--text-muted)]">
                  <Money value={t.balance_after} currency={currency} />
                </Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
    </>
  );
}
