"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/auth";

type Mode = "signin" | "signup";

export default function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") || "/account";
  const prefillEmail = params.get("email") || "";
  const initialMode: Mode = (params.get("mode") as Mode) === "signup" ? "signup" : "signin";

  const { signup, login } = useAuth();

  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState(prefillEmail);
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);

    try {
      if (mode === "signup") {
        const res = await signup({ email: email.trim(), password, name: name.trim() });
        if (!res.ok) {
          setError(res.error);
          return;
        }
        setInfo(res.message || "Account created — check your inbox to verify your email before signing in.");
        setMode("signin");
        setPassword("");
        return;
      }

      const res = await login({ email: email.trim(), password });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      // Successful login — hard redirect so server components re-render fresh.
      window.location.assign(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
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
            : "It takes 30 seconds. We'll send a verification link to your email."}
        </p>

        {error && <div className="auth-alert auth-alert-error">{error}</div>}
        {info && <div className="auth-alert auth-alert-info">{info}</div>}

        <form className="auth-form" onSubmit={onSubmit}>
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
              minLength={mode === "signup" ? 8 : 1}
              disabled={busy}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder=" "
            />
            <span>Password</span>
            {mode === "signup" && <small>At least 8 characters.</small>}
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
