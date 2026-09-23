"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { panelLogin } from "./actions";

export default function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await panelLogin(email, password);
    if (!res.ok) {
      setBusy(false);
      setError(res.error);
      return;
    }
    // Keep the button disabled through the navigation — re-enabling it here
    // lets an impatient second click fire a second sign-in.
    router.replace(next);
    router.refresh();
  }

  return (
    <form onSubmit={submit} noValidate className="mt-5 grid gap-4">
      <div>
        <label className="panel-label" htmlFor="email">Email address</label>
        <input
          id="email"
          className="panel-input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          required
        />
      </div>

      <div>
        <label className="panel-label" htmlFor="password">Password</label>
        <div className="relative">
          <input
            id="password"
            className="panel-input pr-16"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type={show ? "text" : "password"}
            autoComplete="current-password"
            required
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text)]"
          >
            {show ? "Hide" : "Show"}
          </button>
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
        >
          {error}
        </p>
      )}

      <button type="submit" className="panel-btn panel-btn-primary" disabled={busy}>
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
