"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { panelAdminLogin } from "@/app/panel/login/actions";

export default function AdminLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    const result = await panelAdminLogin(email, password);
    if (!result.ok) {
      setBusy(false);
      setError(result.error);
      return;
    }
    router.replace("/panel/admin/orders");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="mt-6 grid gap-4" noValidate>
      <div>
        <label className="panel-label" htmlFor="panel-admin-email">Administrator email</label>
        <input id="panel-admin-email" className="panel-input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div>
        <label className="panel-label" htmlFor="panel-admin-password">Password</label>
        <div className="relative">
          <input id="panel-admin-password" className="panel-input pr-16" type={show ? "text" : "password"} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button type="button" onClick={() => setShow((value) => !value)} className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs font-semibold text-[var(--text-muted)]">{show ? "Hide" : "Show"}</button>
        </div>
      </div>
      {error && <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">{error}</p>}
      <button className="panel-btn panel-btn-primary" type="submit" disabled={busy}>{busy ? "Checking access…" : "Open admin console"}</button>
    </form>
  );
}
