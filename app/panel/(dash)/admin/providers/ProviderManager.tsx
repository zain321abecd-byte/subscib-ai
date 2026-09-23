"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveProvider, testProvider } from "@/lib/panel/actions/admin";
import { Badge, EmptyState, TableWrap, Td, Th } from "@/components/panel/ui";
import type { Provider } from "@/lib/panel/types";

type Form = { name: string; api_url: string; api_key: string; active: boolean };
const BLANK: Form = { name: "", api_url: "", api_key: "", active: true };

export default function ProviderManager({
  providers, serviceCounts,
}: {
  providers: Provider[];
  serviceCounts: Record<string, number>;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tested, setTested] = useState<{ id: string; text: string; ok: boolean } | null>(null);

  function startNew() {
    setEditing("new");
    setForm({ ...BLANK });
    setError(null);
  }

  function startEdit(p: Provider) {
    setEditing(p.id);
    setError(null);
    // The key is intentionally blank: it isn't sent to the browser, and leaving
    // it empty tells the action to keep the stored one.
    setForm({ name: p.name, api_url: p.api_url, api_key: "", active: p.active });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setError(null);
    start(async () => {
      const res = await saveProvider(form, editing === "new" ? undefined : editing!);
      if (!res.ok) { setError(res.error); return; }
      setEditing(null); setForm(null);
      router.refresh();
    });
  }

  function test(id: string) {
    setTested(null);
    start(async () => {
      const res = await testProvider(id);
      setTested(
        res.ok
          ? { id, text: `Connected — balance ${res.data!.balance}`, ok: true }
          : { id, text: res.error, ok: false },
      );
      router.refresh();
    });
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="panel-btn panel-btn-primary" onClick={startNew}>Add provider</button>
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      {form && (
        <form onSubmit={submit} noValidate className="panel-card grid gap-4 p-5 sm:grid-cols-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--text-muted)] sm:col-span-2">
            {editing === "new" ? "New provider" : "Edit provider"}
          </h2>

          <div>
            <label className="panel-label" htmlFor="p-name">Name</label>
            <input id="p-name" className="panel-input" value={form.name}
                   onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="SmmProvider" />
          </div>

          <div>
            <label className="panel-label" htmlFor="p-url">API URL</label>
            <input id="p-url" className="panel-input" value={form.api_url}
                   onChange={(e) => setForm({ ...form, api_url: e.target.value })}
                   placeholder="https://provider.com/api/v2" inputMode="url" />
          </div>

          <div>
            <label className="panel-label" htmlFor="p-key">API key</label>
            <input id="p-key" className="panel-input" type="password" autoComplete="off" value={form.api_key}
                   onChange={(e) => setForm({ ...form, api_key: e.target.value })} />
            <p className="mt-1.5 text-xs text-[var(--text-muted)]">
              {editing === "new"
                ? "Stored server-side and never sent back to the browser."
                : "Leave blank to keep the current key."}
            </p>
          </div>

          <div>
            <label className="panel-label" htmlFor="p-active">Status</label>
            <select id="p-active" className="panel-input" value={form.active ? "yes" : "no"}
                    onChange={(e) => setForm({ ...form, active: e.target.value === "yes" })}>
              <option value="yes">Active</option>
              <option value="no">Paused</option>
            </select>
          </div>

          <div className="flex gap-2 sm:col-span-2">
            <button type="submit" className="panel-btn panel-btn-primary" disabled={pending}>
              {pending ? "Saving…" : "Save provider"}
            </button>
            <button type="button" className="panel-btn panel-btn-ghost"
                    onClick={() => { setEditing(null); setForm(null); }} disabled={pending}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {providers.length === 0 ? (
        <EmptyState
          title="No providers connected"
          body="Add one to forward orders automatically. Without a provider, orders wait in your queue for manual fulfilment — which is a perfectly valid way to run the panel."
        />
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <Th>Provider</Th>
              <Th align="right">Balance</Th>
              <Th align="right">Services</Th>
              <Th>Status</Th>
              <Th>Last checked</Th>
              <Th align="right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {providers.map((p) => (
              <tr key={p.id}>
                <Td>
                  <div className="font-medium text-[var(--text)]">{p.name}</div>
                  <div className="max-w-[260px] truncate text-xs text-[var(--text-muted)]">{p.api_url}</div>
                  {tested?.id === p.id && (
                    <div className={`mt-1 text-xs font-medium ${tested.ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                      {tested.text}
                    </div>
                  )}
                  {p.last_error && tested?.id !== p.id && (
                    <div className="mt-1 max-w-[260px] truncate text-xs text-red-600 dark:text-red-400" title={p.last_error}>
                      Last error: {p.last_error}
                    </div>
                  )}
                </Td>
                <Td align="right" className="whitespace-nowrap font-semibold text-[var(--text)]">
                  {p.balance === null ? "—" : `${Number(p.balance).toLocaleString("en-PK", { minimumFractionDigits: 2 })} ${p.currency}`}
                </Td>
                <Td align="right" className="text-[var(--text-muted)]">{serviceCounts[p.id] ?? 0}</Td>
                <Td><Badge tone={p.active ? "ok" : "neutral"}>{p.active ? "active" : "paused"}</Badge></Td>
                <Td className="whitespace-nowrap text-[var(--text-muted)]">
                  {p.last_synced_at
                    ? new Date(p.last_synced_at).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
                    : "never"}
                </Td>
                <Td align="right">
                  <div className="flex justify-end gap-1.5">
                    <button type="button" className="panel-btn panel-btn-ghost !px-2.5 !py-1 text-xs"
                            onClick={() => test(p.id)} disabled={pending}>
                      Test
                    </button>
                    <button type="button" className="panel-btn panel-btn-ghost !px-2.5 !py-1 text-xs"
                            onClick={() => startEdit(p)} disabled={pending}>
                      Edit
                    </button>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
    </div>
  );
}
