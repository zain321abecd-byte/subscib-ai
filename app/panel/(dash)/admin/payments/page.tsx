import type { Metadata } from "next";
import Link from "next/link";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { EmptyState, Money, PageHeader, Stat, TableWrap, Th } from "@/components/panel/ui";
import type { PaymentRequest } from "@/lib/panel/types";
import PaymentRow from "./PaymentRow";

export const metadata: Metadata = { title: "Payments" };
export const dynamic = "force-dynamic";

const TABS = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "", label: "All" },
];

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const active = status === undefined ? "pending" : status;

  const db = getSupabaseAdmin();
  let query = db.from("panel_payment_requests").select("*").order("created_at", { ascending: false }).limit(300);
  if (active) query = query.eq("status", active);

  const { data } = await query;
  const requests = (data ?? []) as PaymentRequest[];

  const userIds = [...new Set(requests.map((r) => r.user_id))];
  const { data: profileRows } = userIds.length
    ? await db.from("users").select("id, email, name").in("id", userIds)
    : { data: [] };
  const byUser = new Map((profileRows ?? []).map((p: { id: string; email: string; name: string | null }) => [p.id, p]));

  // Counted separately from the filtered list, so the badge is right whatever tab is open.
  const { count: pendingCount } = await db
    .from("panel_payment_requests")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  const pendingValue = requests
    .filter((r) => r.status === "pending")
    .reduce((sum, r) => sum + Number(r.amount || 0), 0);

  return (
    <>
      <PageHeader
        title="Payments"
        subtitle="Top-up requests. Approving one credits the customer's wallet immediately."
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Stat label="Awaiting review" value={(pendingCount ?? 0).toLocaleString()} />
        <Stat label="Value awaiting" value={<Money value={pendingValue} />} hint="On this page" />
        <Stat label="Shown" value={requests.length.toLocaleString()} hint="Most recent 300" />
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {TABS.map((t) => {
          const isActive = active === t.value;
          const href = t.value ? `/admin/payments?status=${t.value}` : "/admin/payments?status=";
          return (
            <Link
              key={t.label}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                isActive ? "bg-brand-600 text-white" : "bg-[var(--surface-3)] text-[var(--text-muted)] hover:text-[var(--text)]"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      {requests.length === 0 ? (
        <EmptyState
          title={active === "pending" ? "Nothing to review" : "No requests here"}
          body="Customers submit a top-up from their wallet page after paying, and it lands here for you to confirm."
        />
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <Th>Submitted</Th>
              <Th>Customer</Th>
              <Th align="right">Amount</Th>
              <Th>Method</Th>
              <Th>Reference</Th>
              <Th>Status</Th>
              <Th align="right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <PaymentRow
                key={r.id}
                request={r}
                customer={byUser.get(r.user_id)?.name || byUser.get(r.user_id)?.email || "unknown"}
              />
            ))}
          </tbody>
        </TableWrap>
      )}
    </>
  );
}
