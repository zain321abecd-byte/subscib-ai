"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createTicket, replyToTicket } from "@/lib/panel/actions/admin";

/** Open a new support ticket. */
export function NewTicketForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <button type="button" className="panel-btn panel-btn-primary" onClick={() => setOpen(true)}>
        New ticket
      </button>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await createTicket(subject, body);
    setBusy(false);
    if (!res.ok) { setError(res.error); return; }
    setSubject(""); setBody(""); setOpen(false);
    router.refresh();
    router.push(`/panel/tickets/${res.data!.id}`);
  }

  return (
    <form onSubmit={submit} noValidate className="panel-card grid w-full gap-3 p-5">
      <div>
        <label className="panel-label" htmlFor="subject">Subject</label>
        <input id="subject" className="panel-input" value={subject} onChange={(e) => setSubject(e.target.value)}
               placeholder="Order not delivered" />
      </div>
      <div>
        <label className="panel-label" htmlFor="body">What&apos;s wrong?</label>
        <textarea id="body" rows={4} className="panel-input" value={body} onChange={(e) => setBody(e.target.value)}
                  placeholder="Include the order ID and what you expected to happen." />
      </div>
      {error && (
        <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button type="submit" className="panel-btn panel-btn-primary" disabled={busy}>
          {busy ? "Opening…" : "Open ticket"}
        </button>
        <button type="button" className="panel-btn panel-btn-ghost" onClick={() => setOpen(false)} disabled={busy}>
          Cancel
        </button>
      </div>
    </form>
  );
}

/** Reply inside a thread. Used by both the customer and staff views. */
export function ReplyForm({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await replyToTicket(ticketId, body);
    setBusy(false);
    if (!res.ok) { setError(res.error); return; }
    setBody("");
    router.refresh();
  }

  return (
    <form onSubmit={submit} noValidate className="panel-card grid gap-3 p-5">
      <label className="panel-label" htmlFor="reply">Reply</label>
      <textarea id="reply" rows={3} className="panel-input" value={body} onChange={(e) => setBody(e.target.value)} />
      {error && (
        <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}
      <button type="submit" className="panel-btn panel-btn-primary justify-self-start" disabled={busy || !body.trim()}>
        {busy ? "Sending…" : "Send reply"}
      </button>
    </form>
  );
}
