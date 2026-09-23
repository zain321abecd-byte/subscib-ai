import type { Metadata } from "next";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requirePanelAdmin } from "@/lib/panel/auth";
import { EmptyState, Money, PageHeader, Stat, TableWrap, Th } from "@/components/panel/ui";
import type { PanelProfile, PanelWallet } from "@/lib/panel/types";
import UserRow from "./UserRow";

export const metadata: Metadata = { title: "Users" };
export const dynamic = "force-dynamic";

export default async function PanelAdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const search = (q || "").trim();

  const me = await requirePanelAdmin();
  const db = getSupabaseAdmin();

  // Identity (name, email) lives on the shop's users table; the panel row only
  // carries panel-specific state. So this is two queries and a join in memory
  // rather than one — small enough at this scale, and it keeps the panel from
  // duplicating contact details it would then have to keep in sync.
  const { data: profileRows } = await db
    .from("panel_profiles")
    .select("user_id, role, status, api_key, created_at")
    .order("created_at", { ascending: false })
    .limit(500);

  const profiles = (profileRows ?? []) as PanelProfile[];
  const ids = profiles.map((p) => p.user_id);

  const { data: accountRows } = ids.length
    ? await db.from("users").select("id, email, name").in("id", ids)
    : { data: [] };

  const accounts = new Map(
    (accountRows ?? []).map((u: { id: string; email: string; name: string | null }) => [u.id, u]),
  );

  const { data: walletRows } = await db.from("panel_wallets").select("user_id, balance, currency");
  const wallets = new Map((walletRows ?? []).map((w: PanelWallet) => [w.user_id, w]));

  // Searching after the join, since the term can match either table.
  const needle = search.toLowerCase();
  const visible = needle
    ? profiles.filter((p) => {
        const a = accounts.get(p.user_id);
        return (
          (a?.email || "").toLowerCase().includes(needle) ||
          (a?.name || "").toLowerCase().includes(needle)
        );
      })
    : profiles;

  const totalBalance = (walletRows ?? []).reduce(
    (sum: number, w: PanelWallet) => sum + Number(w.balance || 0),
    0,
  );
  const admins = profiles.filter((p) => p.role === "admin").length;
  const suspended = profiles.filter((p) => p.status === "suspended").length;

  return (
    <>
      <PageHeader
        title="Users"
        subtitle="Everyone who has opened the panel, with their role and balance."
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Panel users" value={profiles.length.toLocaleString()} hint="Shop accounts that have signed in here" />
        <Stat label="Administrators" value={admins.toLocaleString()} />
        <Stat label="Suspended" value={suspended.toLocaleString()} />
        <Stat label="Balance held" value={<Money value={totalBalance} />} hint="Across all wallets" />
      </div>

      <form method="get" className="mb-4 flex flex-wrap gap-2">
        <input
          name="q"
          defaultValue={search}
          placeholder="Search by name or email"
          className="panel-input max-w-xs"
          aria-label="Search users"
        />
        <button type="submit" className="panel-btn panel-btn-ghost">Search</button>
      </form>

      {visible.length === 0 ? (
        <EmptyState
          title={search ? "No users match that search" : "Nobody has used the panel yet"}
          body={
            search
              ? "Try part of an email address instead."
              : "A row appears here the first time someone opens /panel with their shop account."
          }
        />
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <Th>User</Th>
              <Th align="right">Balance</Th>
              <Th>Role</Th>
              <Th>Status</Th>
              <Th>Joined</Th>
              <Th align="right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {visible.map((p) => (
              <UserRow
                key={p.user_id}
                profile={p}
                name={accounts.get(p.user_id)?.name ?? null}
                email={accounts.get(p.user_id)?.email ?? "unknown"}
                balance={Number(wallets.get(p.user_id)?.balance ?? 0)}
                currency={wallets.get(p.user_id)?.currency ?? "PKR"}
                isSelf={p.user_id === me.id}
              />
            ))}
          </tbody>
        </TableWrap>
      )}
    </>
  );
}
