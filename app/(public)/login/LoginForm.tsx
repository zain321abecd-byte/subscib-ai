"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getSupabaseBrowser, isSupabaseConfigured } from "@/lib/supabase/browser";

type Mode = "signin" | "signup";

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/account";
  const initialMode: Mode = (params.get("mode") as Mode) === "signup" ? "signup" : "signin";

  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const configured = isSupabaseConfigured();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!configured) {
      setError("Sign-in is not configured yet.");
      return;
    }
    setBusy(true);
    setError(null);
    setInfo(null);

    try {
      const supabase = getSupabaseBrowser();

      if (mode === "signup") {
        // Build the redirect URL from the current origin so production users
        // never get bounced to localhost. The query param lets the post-confirm
        // page show a friendly "you're verified" message.
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        const emailRedirectTo = `${origin}/auth/confirm?next=${encodeURIComponent(next)}`;

        const { data, error: err } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { full_name: name.trim() },
            emailRedirectTo,
          },
        });
        if (err) throw err;
        // If email confirmation is enabled in Supabase, no session yet.
        if (!data.session) {
          setInfo("Check your inbox to confirm your email — we sent a verification link.");
          setMode("signin");
          return;
        }
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (err) throw err;
      }

      // Hard redirect so the new auth cookie is on the next request.
      window.location.assign(next);
    } catch (e: any) {
      setError(e?.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="auth-section">
      <div className="auth-card">
        <Link href="/" className="auth-brand" aria-label="SubscribAI home">
          <Image
            src="/assets/subscribai-logo.png"
            alt="SubscribAI"
            width={149}
            height={36}
            priority
            className="auth-brand-logo"
          />
        </Link>

        <div className="auth-tabs" role="tablist" aria-label="Sign in or sign up">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "signin"}
            className={`auth-tab ${mode === "signin" ? "is-active" : ""}`}
            onClick={() => { setMode("signin"); setError(null); setInfo(null); }}
          >
            Sign in
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "signup"}
            className={`auth-tab ${mode === "signup" ? "is-active" : ""}`}
            onClick={() => { setMode("signup"); setError(null); setInfo(null); }}
          >
            Create account
          </button>
        </div>

        <h1>{mode === "signin" ? "Welcome back" : "Create your account"}</h1>
        <p className="auth-tagline">
          {mode === "signin"
            ? "Sign in to place an order, track deliveries, and manage your subscriptions."
            : "It takes 30 seconds. We'll use your email to deliver subscription credentials."}
        </p>

        {error && <div className="auth-alert auth-alert-error">{error}</div>}
        {info && <div className="auth-alert auth-alert-info">{info}</div>}

        <form className="auth-form" onSubmit={onSubmit}>
          {/* Floating-label fields: input first, <span> after — the label
              floats up via the CSS sibling selector when the input is focused,
              filled, or autofilled. The single-space placeholder is required:
              it activates :placeholder-shown so the empty state is detectable. */}
          {mode === "signup" && (
            <label className="auth-field">
              <input
                type="text"
                autoComplete="name"
                required
                disabled={busy}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder=" "
              />
              <span>Full name</span>
            </label>
          )}

          <label className="auth-field">
            <input
              type="email"
              autoComplete="email"
              required
              disabled={busy}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder=" "
            />
            <span>Email</span>
          </label>

          <label className="auth-field">
            <input
              type="password"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              required
              minLength={6}
              disabled={busy}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder=" "
            />
            <span>Password</span>
            {mode === "signup" && <small>At least 6 characters.</small>}
          </label>

          <button type="submit" className="btn btn-primary btn-large auth-submit" disabled={busy}>
            {busy ? (
              <>
                <span className="admin-spinner" />
                {mode === "signin" ? "Signing in…" : "Creating account…"}
              </>
            ) : (
              <>
                {mode === "signin" ? "Sign in" : "Create account"}
                <i className="fa-solid fa-arrow-right"></i>
              </>
            )}
          </button>
        </form>

        <p className="auth-switch">
          {mode === "signin" ? (
            <>New here? <button type="button" onClick={() => setMode("signup")}>Create an account</button></>
          ) : (
            <>Already a customer? <button type="button" onClick={() => setMode("signin")}>Sign in</button></>
          )}
        </p>

        <p className="auth-back">
          <Link href="/">← Back to site</Link>
        </p>

        {next && next !== "/account" && (
          <p className="auth-next">
            After {mode === "signup" ? "signing up" : "signing in"} you&rsquo;ll be returned to <code>{next}</code>.
          </p>
        )}
      </div>
    </section>
  );
}
