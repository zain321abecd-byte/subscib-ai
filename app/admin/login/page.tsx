"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getSupabaseBrowser, isSupabaseConfigured } from "@/lib/supabase/browser";

function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") || "/admin";
  const errorParam = params.get("error");
  const configured = isSupabaseConfigured();

  const initialError =
    errorParam === "not_configured" || !configured
      ? "Supabase isn't configured yet. Add the env vars from ADMIN_SETUP.md and redeploy."
      : errorParam === "not_admin"
      ? "Your account isn't authorised to access the admin panel."
      : "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // "idle" | "auth" (signing in) | "verify" (admin check) | "redirect"
  const [stage, setStage] = useState<"idle" | "auth" | "verify" | "redirect">("idle");
  const [error, setError] = useState(initialError);
  const busy = stage !== "idle";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!configured) {
      setError("Supabase isn't configured yet. Add the env vars from ADMIN_SETUP.md and redeploy.");
      return;
    }
    setStage("auth");
    setError("");
    try {
      const supabase = getSupabaseBrowser();
      const { error: authErr } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (authErr) {
        setError(authErr.message);
        setStage("idle");
        return;
      }
      // Confirm admin row exists before redirecting (so non-admin Supabase
      // users get a clear error instead of an instant redirect → bounce loop).
      setStage("verify");
      const { data: adminRow, error: adminErr } = await supabase
        .from("admins")
        .select("user_id")
        .maybeSingle();
      if (adminErr || !adminRow) {
        await supabase.auth.signOut();
        setError("This account is not registered as an admin.");
        setStage("idle");
        return;
      }
      // Hard redirect — guarantees the auth cookie is on the next request,
      // and avoids the router.push/refresh race that can leave the user
      // stuck on /admin/login even after a successful sign-in.
      setStage("redirect");
      window.location.assign(next);
    } catch (err: any) {
      setError(err?.message || "Something went wrong.");
      setStage("idle");
    }
  }

  const buttonLabel =
    stage === "auth"     ? "Signing in…" :
    stage === "verify"   ? "Verifying admin access…" :
    stage === "redirect" ? "Redirecting…" :
    "Sign in";

  return (
    <div className="admin-login-wrap">
      <form className="admin-login-card" onSubmit={onSubmit}>
        <div className="admin-brand" style={{ marginBottom: 4 }}>
          <span className="admin-brand-mark">S</span>
          SubscribAI
        </div>
        <h1>Sign in to admin</h1>
        <p>Use the email + password registered in Supabase Auth.</p>

        {error && <div className="admin-login-error">{error}</div>}

        <label className="admin-label" htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          required
          disabled={busy}
          className="admin-input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ marginBottom: 12 }}
        />

        <label className="admin-label" htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          disabled={busy}
          className="admin-input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ marginBottom: 18 }}
        />

        <button
          type="submit"
          className="admin-btn admin-btn-primary"
          style={{ width: "100%", justifyContent: "center", gap: 10 }}
          disabled={busy}
          aria-busy={busy}
        >
          {busy && <span className="admin-spinner" />}
          {buttonLabel}
        </button>

        <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: 16, textAlign: "center" }}>
          <Link href="/" style={{ color: "var(--text-soft)" }}>← Back to site</Link>
        </p>
      </form>
    </div>
  );
}

function LoginFallback() {
  return (
    <div className="admin-login-wrap">
      <div className="admin-login-card" style={{ display: "grid", placeItems: "center", padding: 36 }}>
        <span className="admin-spinner lg" style={{ color: "var(--brand-300)" }} />
        <p style={{ color: "var(--text-muted)", marginTop: 14, fontSize: "0.9rem" }}>Loading…</p>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}
