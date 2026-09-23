import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requirePanelUser } from "@/lib/panel/auth";
import { PageHeader, TicketBadge } from "@/components/panel/ui";
import type { Ticket, TicketMessage } from "@/lib/panel/types";
import { ReplyForm } from "../TicketForms";

export const metadata: Metadata = { title: "Ticket" };
export const dynamic = "force-dynamic";

export default async function PanelTicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requirePanelUser();
  const db = getSupabaseAdmin();

  const { data } = await db.from("panel_tickets").select("*").eq("id", id).maybeSingle();
  const ticket = data as Ticket | null;
  if (!ticket) notFound();

  // Load-bearing, not belt-and-braces: the service-role client returns any row
  // it's asked for, so without this check a ticket id from someone else's
  // account would render their thread. notFound() rather than a 403 so the
  // response doesn't confirm the id exists.
  if (!user.isAdmin && ticket.user_id !== user.id) notFound();

  const { data: messages } = await db
    .from("panel_ticket_messages")
    .select("*")
    .eq("ticket_id", id)
    .order("created_at");

  const thread = (messages ?? []) as TicketMessage[];

  return (
    <>
      <p className="mb-2">
        <Link href="/panel/tickets" className="text-sm text-[var(--text-muted)] hover:underline">
          ← Support
        </Link>
      </p>
      <PageHeader
        title={ticket.subject}
        subtitle={`Opened ${new Date(ticket.created_at).toLocaleDateString()}`}
        action={<TicketBadge status={ticket.status} />}
      />

      <div className="mb-5 grid gap-3">
        {thread.map((m) => (
          <div
            key={m.id}
            className={`panel-card p-4 ${m.is_staff ? "border-l-4 border-l-brand-500" : ""}`}
          >
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <span className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
                {m.is_staff ? "Support" : user.isAdmin ? "Customer" : "You"}
              </span>
              <span className="text-xs text-[var(--text-muted)]">
                {new Date(m.created_at).toLocaleString(undefined, {
                  day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                })}
              </span>
            </div>
            <p className="whitespace-pre-wrap text-sm text-[var(--text)]">{m.body}</p>
          </div>
        ))}
      </div>

      {ticket.status !== "closed" ? (
        <ReplyForm ticketId={id} />
      ) : (
        <p className="text-sm text-[var(--text-muted)]">
          This ticket is closed. Open a new one if you still need help.
        </p>
      )}
    </>
  );
}
