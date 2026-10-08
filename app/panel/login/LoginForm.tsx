"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { panelLogin, panelSignup } from "./actions";

export default function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    if (mode === "signup") {
      if (password !== confirm) {
        setBusy(false);
        setError("The two passwords don't match.");
        return;
      }
      const created = await panelSignup({ name, email, password });
      setBusy(false);
      if (!created.ok) {
        setError(created.error);
        return;
      }
      setInfo(created.message);
      setMode("signin");
      setPassword("");
      setConfirm("");
      return;
    }
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
      <div className="grid grid-cols-2 rounded-xl bg-[var(--surface-2)] p-1" role="tablist" aria-label="Panel account">
        <button type="button" role="tab" aria-selected={mode === "signin"} onClick={() => { setMode("signin"); setError(null); setInfo(null); }} className={`rounded-lg px-3 py-2 text-sm font-semibold ${mode === "signin" ? "bg-[var(--surface)] text-[var(--text)] shadow-sm" : "text-[var(--text-muted)]"}`}>Sign in</button>
        <button type="button" role="tab" aria-selected={mode === "signup"} onClick={() => { setMode("signup"); setError(null); setInfo(null); }} className={`rounded-lg px-3 py-2 text-sm font-semibold ${mode === "signup" ? "bg-[var(--surface)] text-[var(--text)] shadow-sm" : "text-[var(--text-muted)]"}`}>Create account</button>
      </div>

      {mode === "signup" && (
        <div>
          <label className="panel-label" htmlFor="panel-name">Full name</label>
          <input id="panel-name" className="panel-input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
        </div>
      )}
      <div>
        <label className="panel-label" htmlFor="panel-email">Email address</label>
        <input
          id="panel-email"
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
        <label className="panel-label" htmlFor="panel-password">Password</label>
        <div className="relative">
          <input
            id="panel-password"
            className="panel-input pr-16"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type={show ? "text" : "password"}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            minLength={mode === "signup" ? 8 : undefined}
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

      {mode === "signup" && (
        <div>
          <label className="panel-label" htmlFor="panel-confirm">Confirm password</label>
          <input id="panel-confirm" className="panel-input" value={confirm} onChange={(e) => setConfirm(e.target.value)} type="password" autoComplete="new-password" minLength={8} required />
          <p className="mt-1 text-xs text-[var(--text-muted)]">One account works on both the shop and panel.</p>
        </div>
      )}

      {info && (
        <p role="status" className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">{info}</p>
      )}

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
        >
          {error}
        </p>
      )}

      <button type="submit" className="panel-btn panel-btn-primary" disabled={busy}>
        {busy ? (mode === "signup" ? "Creating account…" : "Signing in…") : (mode === "signup" ? "Create account" : "Sign in")}
      </button>
    </form>
  );
}
