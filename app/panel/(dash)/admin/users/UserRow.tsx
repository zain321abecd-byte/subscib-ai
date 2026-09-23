"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adjustBalance, setUserRole, setUserStatus } from "@/lib/panel/actions/admin";
import { Badge, Money, Td } from "@/components/panel/ui";
import type { PanelProfile } from "@/lib/panel/types";

export default function UserRow({
  profile, name, email, balance, currency, isSelf,
}: {
  profile: PanelProfile;
  name: string | null;
  email: string;
  balance: number;
  currency: string;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"credit" | "debit">("credit");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    start(async () => {
      const res = await action();
      if (!res.ok) { setError(res.error || "That didn't work."); return; }
      router.refresh();
    });
  }

  function submitAdjust(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const value = Number(amount);
    start(async () => {
      const res = await adjustBalance(profile.user_id, type, value, note);
      if (!res.ok) { setError(res.error); return; }
      setAmount(""); setNote(""); setOpen(false); setDone(true);
      setTimeout(() => setDone(false), 3000);
      router.refresh();
    });
  }

  return (
    <>
      <tr>
        <Td>
          <div className="font-medium text-[var(--text)]">{name || "—"}</div>
          <div className="text-xs text-[var(--text-muted)]">{email}</div>
        </Td>
        <Td align="right" className="whitespace-nowrap font-semibold text-[var(--text)]">
          <Money value={balance} currency={currency} />
          {done && <div className="text-xs font-normal text-emerald-600 dark:text-emerald-400">updated</div>}
        </Td>
        <Td>
          <Badge tone={profile.role === "admin" ? "info" : "neutral"}>{profile.role}</Badge>
        </Td>
        <Td>
          <Badge tone={profile.status === "suspended" ? "danger" : "ok"}>{profile.status}</Badge>
        </Td>
        <Td className="whitespace-nowrap text-[var(--text-muted)]">
          {new Date(profile.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
        </Td>
        <Td align="right">
          <div className="flex flex-wrap justify-end gap-1.5">
            <button
              type="button"
              className="panel-btn panel-btn-ghost !px-2.5 !py-1 text-xs"
              onClick={() => setOpen((v) => !v)}
              disabled={pending}
            >
              {open ? "Cancel" : "Adjust balance"}
            </button>
            <button
              type="button"
              className="panel-btn panel-btn-ghost !px-2.5 !py-1 text-xs"
              disabled={pending || isSelf}
              title={isSelf ? "You can't change your own role" : undefined}
              onClick={() => run(() => setUserRole(profile.user_id, profile.role === "admin" ? "user" : "admin"))}
            >
              {profile.role === "admin" ? "Make user" : "Make admin"}
            </button>
            <button
              type="button"
              className="panel-btn panel-btn-ghost !px-2.5 !py-1 text-xs"
              disabled={pending || isSelf}
              title={isSelf ? "You can't suspend yourself" : undefined}
              onClick={() => run(() => setUserStatus(profile.user_id, profile.status === "suspended" ? "active" : "suspended"))}
            >
              {profile.status === "suspended" ? "Reactivate" : "Suspend"}
            </button>
          </div>
        </Td>
      </tr>

      {(open || error) && (
        <tr>
          <td colSpan={6} className="border-b border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
            {error && (
              <p role="alert" className="mb-2 text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
            )}
            {open && (
              <form onSubmit={submitAdjust} className="flex flex-wrap items-end gap-2">
                <div>
                  <label className="panel-label" htmlFor={`type-${profile.user_id}`}>Type</label>
                  <select
                    id={`type-${profile.user_id}`}
                    className="panel-input !py-1.5 text-sm"
                    value={type}
                    onChange={(e) => setType(e.target.value as "credit" | "debit")}
                  >
                    <option value="credit">Credit (add)</option>
                    <option value="debit">Debit (take)</option>
                  </select>
                </div>
                <div>
                  <label className="panel-label" htmlFor={`amount-${profile.user_id}`}>Amount</label>
                  <input
                    id={`amount-${profile.user_id}`}
                    className="panel-input !py-1.5 text-sm"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    inputMode="decimal"
                    placeholder="1000"
                  />
                </div>
                <div className="min-w-[200px] flex-1">
                  <label className="panel-label" htmlFor={`note-${profile.user_id}`}>Reason</label>
                  <input
                    id={`note-${profile.user_id}`}
                    className="panel-input !py-1.5 text-sm"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Bank transfer received — TRX123"
                  />
                </div>
                <button type="submit" className="panel-btn panel-btn-primary !py-1.5 text-sm" disabled={pending}>
                  {pending ? "Applying…" : "Apply"}
                </button>
                <p className="w-full text-xs text-[var(--text-muted)]">
                  This writes to the customer&apos;s statement with your reason attached, so it&apos;s visible to them.
                </p>
              </form>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
