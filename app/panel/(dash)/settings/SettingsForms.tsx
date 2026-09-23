"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { regenerateApiKey, updateProfileName } from "@/lib/panel/actions/admin";

export function ProfileForm({ initialName, email }: { initialName: string; email: string }) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await updateProfileName(name);
    setBusy(false);
    if (!res.ok) { setError(res.error); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    router.refresh();
  }

  return (
    <form onSubmit={submit} noValidate className="panel-card grid gap-4 p-5">
      <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--text-muted)]">Profile</h2>

      <div>
        <label className="panel-label" htmlFor="email">Email</label>
        <input id="email" className="panel-input" value={email} disabled />
        <p className="mt-1.5 text-xs text-[var(--text-muted)]">
          Your sign-in address. Changing it needs a confirmation email, so it&apos;s handled by support for now.
        </p>
      </div>

      <div>
        <label className="panel-label" htmlFor="name">Full name</label>
        <input id="name" className="panel-input" value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button type="submit" className="panel-btn panel-btn-primary" disabled={busy}>
          {busy ? "Saving…" : "Save changes"}
        </button>
        {saved && <span role="status" className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Saved</span>}
      </div>
    </form>
  );
}

export function ApiKeyPanel({ hasKey }: { hasKey: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [key, setKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function generate() {
    setError(null);
    setBusy(true);
    const res = await regenerateApiKey();
    setBusy(false);
    if (!res.ok) { setError(res.error); return; }
    setKey(res.data!.apiKey);
    router.refresh();
  }

  async function copy() {
    if (!key) return;
    try {
      await navigator.clipboard.writeText(key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Your browser blocked the clipboard — select the key and copy it manually.");
    }
  }

  return (
    <div className="panel-card grid gap-4 p-5">
      <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--text-muted)]">API key</h2>
      <p className="text-sm text-[var(--text-muted)]">
        For placing orders from your own site or script. Treat it like a password — anyone holding it can
        spend your balance.
      </p>

      {key && (
        <div className="grid gap-2 rounded-lg border border-emerald-300 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950">
          <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
            Copy it now — this is the only time it&apos;s shown in full.
          </p>
          <code className="block overflow-x-auto rounded bg-[var(--surface)] px-2 py-1.5 text-xs text-[var(--text)]">
            {key}
          </code>
          <button type="button" onClick={copy} className="panel-btn panel-btn-ghost justify-self-start !py-1.5 text-xs">
            {copied ? "Copied" : "Copy key"}
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      <button type="button" onClick={generate} className="panel-btn panel-btn-ghost justify-self-start" disabled={busy}>
        {busy ? "Generating…" : hasKey ? "Regenerate key" : "Generate key"}
      </button>

      {hasKey && !key && (
        <p className="text-xs text-[var(--text-muted)]">
          A key is already active. Regenerating replaces it immediately — anything using the old one stops working.
        </p>
      )}
    </div>
  );
}
