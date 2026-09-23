import type { Metadata } from "next";
import Link from "next/link";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requirePanelUser } from "@/lib/panel/auth";
import { EmptyState, PageHeader, TableWrap, Td, Th, TicketBadge } from "@/components/panel/ui";
import type { Ticket } from "@/lib/panel/types";
import { NewTicketForm } from "./TicketForms";

export const metadata: Metadata = { title: "Support" };
export const dynamic = "force-dynamic";

export default async function PanelTicketsPage() {
  const user = await requirePanelUser();
  const db = getSupabaseAdmin();

  let query = db.from("panel_tickets").select("*").order("updated_at", { ascending: false }).limit(200);
  // Staff see everything; everyone else is pinned to their own rows. There is
  // no RLS behind this, so the filter is the access control.
  if (!user.isAdmin) query = query.eq("user_id", user.id);

  const { data } = await query;
  const tickets = (data ?? []) as Ticket[];

  return (
    <>
      <PageHeader
        title="Support"
        subtitle={
          user.isAdmin
            ? "Every ticket across the panel."
            : "Ask us anything about an order or your account."
        }
        action={<NewTicketForm />}
      />

      {tickets.length === 0 ? (
        <EmptyState
          title="No tickets"
          body={
            user.isAdmin
              ? "Customer tickets will appear here."
              : "Open one and we'll reply in the thread — you'll see our answer on this page."
          }
        />
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <Th>Subject</Th>
              <Th>Status</Th>
              <Th>Opened</Th>
              <Th>Last activity</Th>
              <Th align="right" />
            </tr>
          </thead>
          <tbody>
            {tickets.map((t) => (
              <tr key={t.id}>
                <Td className="font-medium text-[var(--text)]">{t.subject}</Td>
                <Td><TicketBadge status={t.status} /></Td>
                <Td className="whitespace-nowrap text-[var(--text-muted)]">
                  {new Date(t.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                </Td>
                <Td className="whitespace-nowrap text-[var(--text-muted)]">
                  {new Date(t.updated_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                </Td>
                <Td align="right">
                  <Link
                    href={`/panel/tickets/${t.id}`}
                    className="text-sm font-semibold text-brand-600 hover:underline dark:text-brand-400"
                  >
                    Open
                  </Link>
                </Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
    </>
  );
}
