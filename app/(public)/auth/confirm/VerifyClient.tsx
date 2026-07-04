"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiBaseUrl } from "@/lib/api-client";

type Status = "verifying" | "success" | "already" | "error";

export default function VerifyClient({
  token,
  email,
  next,
  whatsappUrl,
}: {
  token: string;
  email: string;
  next: string;
  /** Fully-built `https://wa.me/…` URL from dynamic site_settings. */
  whatsappUrl: string;
}) {
  const [status, setStatus] = useState<Status>("verifying");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [verifiedEmail, setVerifiedEmail] = useState<string>(email);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(
          `${apiBaseUrl()}/auth/verify?token=${encodeURIComponent(token)}`,
          { method: "GET" },
        );
        const data = await res.json().catch(() => ({} as Record<string, unknown>));

        if (cancelled) return;

        if (!res.ok || data?.ok === false) {
          setErrorMessage(
            (data?.message as string) ||
              "Verification link is invalid or has already been used.",
          );
          setStatus("error");
          return;
        }

        if (typeof data?.email === "string") setVerifiedEmail(data.email);
        setStatus(data?.alreadyVerified ? "already" : "success");
      } catch (err) {
        if (cancelled) return;
        setErrorMessage(err instanceof Error ? err.message : "Network error.");
        setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  if (status === "verifying") {
    return (
      <section className="auth-section">
        <div className="auth-card">
          <div className="confirm-hero">
            <i className="fa-solid fa-spinner fa-spin"></i>
          </div>
          <h1>Verifying your email…</h1>
          <p className="auth-tagline">Hang on, this only takes a second.</p>
        </div>
      </section>
    );
  }

  if (status === "error") {
    return (
      <section className="auth-section">
        <div className="auth-card">
          <div className="confirm-hero confirm-hero-error">
            <i className="fa-solid fa-circle-xmark"></i>
          </div>
          <h1>Couldn&rsquo;t verify your email</h1>
          <p className="auth-tagline">{errorMessage}</p>
          <p className="auth-tagline" style={{ marginTop: 8 }}>
            The link may have expired. Try signing in — if your account exists, we&rsquo;ll
            help you resend the verification email.
          </p>
          <Link href="/login" className="btn btn-primary btn-large auth-submit">
            Go to sign in <i className="fa-solid fa-arrow-right"></i>
          </Link>
          <p
            style={{
              marginTop: 18,
              textAlign: "center",
              fontSize: "var(--fs-sm)",
              color: "var(--text-muted)",
            }}
          >
            Still stuck? <Link href="/contact" style={{ color: "var(--brand-300)" }}>Contact support</Link>.
          </p>
        </div>
      </section>
    );
  }

  // success | already
  return (
    <section className="auth-section">
      <div className="auth-card">
        <div className="confirm-hero">
          <i className="fa-solid fa-circle-check"></i>
        </div>

        <h1>{status === "already" ? "Already verified" : "Your account is ready"}</h1>
        <p className="auth-tagline">
          {verifiedEmail
            ? <>We&rsquo;ve verified <strong style={{ color: "var(--text)" }}>{verifiedEmail}</strong>. Your SubscribAI account is active.</>
            : <>Your email is verified and your SubscribAI account is active.</>}
        </p>

        <ol
          style={{
            listStyle: "none",
            padding: 0,
            margin: "var(--space-5) 0",
            display: "grid",
            gap: "var(--space-3)",
            textAlign: "left",
          }}
        >
          {[
            { n: 1, t: "Sign in", d: "Use the same email and password you signed up with." },
            { n: 2, t: "Browse the shop", d: "Pick from premium AI subscriptions, courses & automation packs." },
            { n: 3, t: "Pay your way", d: "JazzCash, Easypaisa, bank or card on PayFast's secure checkout." },
          ].map((s) => (
            <li
              key={s.n}
              style={{
                display: "grid",
                gridTemplateColumns: "auto 1fr",
                gap: "var(--space-3)",
                alignItems: "start",
                padding: "var(--space-3)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                background: "var(--surface)",
              }}
            >
              <span
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "var(--brand-soft)",
                  color: "var(--brand-300)",
                  display: "grid",
                  placeItems: "center",
                  fontFamily: "var(--font-heading)",
                  fontWeight: 700,
                  fontSize: 14,
                }}
              >
                {s.n}
              </span>
              <div>
                <strong style={{ color: "var(--text)", display: "block", marginBottom: 2, fontFamily: "var(--font-heading)" }}>
                  {s.t}
                </strong>
                <span style={{ color: "var(--text-muted)", fontSize: "var(--fs-sm)" }}>{s.d}</span>
              </div>
            </li>
          ))}
        </ol>

        <Link
          href={`/login?next=${encodeURIComponent(next)}${verifiedEmail ? `&email=${encodeURIComponent(verifiedEmail)}` : ""}`}
          className="btn btn-primary btn-large auth-submit"
        >
          Sign in to my account <i className="fa-solid fa-arrow-right"></i>
        </Link>

        <div style={{ marginTop: "var(--space-3)", textAlign: "center" }}>
          <Link
            href="/shop"
            style={{
              display: "inline-block",
              padding: "10px 16px",
              color: "var(--text-soft)",
              fontSize: "var(--fs-sm)",
            }}
          >
            Browse the shop first →
          </Link>
        </div>

        <p
          style={{
            marginTop: "var(--space-4)",
            textAlign: "center",
            fontSize: "var(--fs-xs)",
            color: "var(--text-muted)",
            lineHeight: 1.6,
          }}
        >
          Need help? <Link href="/contact" style={{ color: "var(--brand-300)" }}>Contact support</Link> or
          message us on <a href={whatsappUrl} style={{ color: "var(--brand-300)" }}>WhatsApp</a>.
        </p>
      </div>
    </section>
  );
}
