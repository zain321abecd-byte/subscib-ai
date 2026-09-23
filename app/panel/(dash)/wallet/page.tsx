import type { Metadata } from "next";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requirePanelUser } from "@/lib/panel/auth";
import { EmptyState, Money, PageHeader, PaymentBadge, Stat, TableWrap, Td, Th } from "@/components/panel/ui";
import type { PaymentRequest } from "@/lib/panel/types";
import TopUpMethods from "./TopUpMethods";

export const metadata: Metadata = { title: "Add funds" };
export const dynamic = "force-dynamic";

/**
 * What to tell the customer when PayFast sends them back.
 *
 * This is presentation only. The wallet is credited by the gateway callback on
 * the API, never by this page — landing here with ?topup=paid proves nothing
 * on its own, which is why the balance shown is always read fresh from the
 * database rather than inferred from the URL.
 */
function returnNotice(topup: string | undefined, code: string | undefined) {
  if (!topup) return null;
  if (topup === "paid") {
    return {
      tone: "ok" as const,
      text: "Payment received. Your balance below is up to date — if it looks unchanged, give it a few seconds and refresh.",
    };
  }
  if (topup === "pending") {
    return {
      tone: "warn" as const,
      text: "Your payment is still settling with the bank. The balance updates by itself once it clears — no need to pay again.",
    };
  }
  if (topup === "unverified") {
    return {
      tone: "warn" as const,
      text: "We couldn't verify that payment result. If money left your account, contact support with the time and amount — don't pay again.",
    };
  }
  return {
    tone: "danger" as const,
    text: `The payment didn't go through${code ? ` (code ${code})` : ""}. Nothing was charged — you can try again.`,
  };
}

const TONES = {
  ok: "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
  warn: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
  danger: "border-red-300 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300",
};

export default async function WalletPage({
  searchParams,
}: {
  searchParams: Promise<{ topup?: string; code?: string }>;
}) {
  const { topup, code } = await searchParams;
  const user = await requirePanelUser();
  const db = getSupabaseAdmin();

  const [{ data: wallet }, { data: requests }, { data: account }] = await Promise.all([
    db.from("panel_wallets").select("balance, currency").eq("user_id", user.id).maybeSingle(),
    db
      .from("panel_payment_requests")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50),
    db.from("users").select("phone").eq("id", user.id).maybeSingle(),
  ]);

  const currency = wallet?.currency ?? "PKR";
  const list = (requests ?? []) as PaymentRequest[];
  const pending = list.filter((r) => r.status === "pending");
  const notice = returnNotice(topup, code);

  return (
    <>
      <PageHeader title="Add funds" subtitle="Top up your wallet so you can place orders." />

      {notice && (
        <p role="status" className={`mb-5 rounded-lg border px-3 py-2.5 text-sm ${TONES[notice.tone]}`}>
          {notice.text}
        </p>
      )}

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Stat label="Current balance" value={<Money value={wallet?.balance} currency={currency} />} />
        <Stat
          label="Awaiting confirmation"
          value={pending.length}
          hint={pending.length ? "Bank transfers need an admin; card payments clear by themselves" : undefined}
        />
        <Stat
          label="Pending value"
          value={<Money value={pending.reduce((a, r) => a + Number(r.amount), 0)} currency={currency} />}
        />
      </div>

      <div className="grid gap-5 md:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <TopUpMethods currency={currency} defaultMobile={account?.phone ?? ""} />

        <div>
          <h2 className="mb-2 text-sm font-bold text-[var(--text)]">Your top-ups</h2>
          {list.length === 0 ? (
            <EmptyState
              title="No top-ups yet"
              body="Pay online and your balance updates straight away, or tell us about a bank transfer and an admin will confirm it."
            />
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
                      {new Date(r.created_at).toLocaleDateString(undefined, {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </Td>
                    <Td align="right" className="whitespace-nowrap font-semibold text-[var(--text)]">
                      <Money value={r.amount} currency={currency} />
                    </Td>
                    <Td className="text-[var(--text-muted)]">
                      {r.gateway === "payfast" ? "PayFast" : <span className="capitalize">{r.method}</span>}
                    </Td>
                    <Td className="text-[var(--text-muted)]">
                      {r.gateway === "payfast" ? r.gateway_txn_id || r.basket_id || "—" : r.reference || "—"}
                    </Td>
                    <Td>
                      <PaymentBadge status={r.status} />
                      {r.admin_note && (
                        <div className="mt-1 max-w-[220px] text-xs text-[var(--text-muted)]">{r.admin_note}</div>
                      )}
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
