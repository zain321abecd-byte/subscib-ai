"use client";

import { useState } from "react";
import Link from "next/link";
import { isEmail, isPlausiblePhone } from "@/lib/product-forms";

/**
 * The customer-facing half of a request form: name, phone, email, submit.
 *
 * Deliberately collects nothing else — no address, no CNIC, no product choice,
 * no payment details. The product and its price come from the database on the
 * server; nothing about them is submitted from here, so they can't be tampered
 * with.
 */
export default function RequestFormClient({
  slug,
  productName,
}: {
  slug: string;
  productName: string;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState(""); // honeypot — real people leave it empty
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ requestNo: string | null } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) return setError("Please enter your full name.");
    if (!isPlausiblePhone(phone)) return setError("Please enter a valid phone number.");
    if (!isEmail(email)) return setError("Please enter a valid email address.");

    setBusy(true);
    try {
      const res = await fetch(`/api/forms/${encodeURIComponent(slug)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, email, company }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(payload?.error || "Something went wrong. Please try again.");
        return;
      }
      setDone({ requestNo: payload?.requestNo ?? null });
    } catch {
      setError("We couldn't reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <section
        aria-live="polite"
        style={{
          border: "1px solid rgba(34,197,94,0.35)",
          background: "rgba(34,197,94,0.10)",
          borderRadius: 12,
          padding: "22px 20px",
          textAlign: "center",
        }}
      >
        <i className="fa-solid fa-circle-check" style={{ fontSize: 30, color: "#22c55e", display: "block", marginBottom: 12 }} aria-hidden="true" />
        <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1.25rem", margin: "0 0 8px" }}>
          Request received
        </h2>
        <p style={{ margin: "0 0 6px", lineHeight: 1.6 }}>
          Thanks {name.trim().split(" ")[0] || "—"}, we&apos;ve got your request for <strong>{productName}</strong>.
          Our team will confirm it shortly and contact you on the number you gave us.
        </p>
        {done.requestNo && (
          <p style={{ margin: "10px 0 0", color: "var(--text-muted)", fontSize: "0.9rem" }}>
            Your reference is <strong>{done.requestNo}</strong>. Keep it handy if you need to follow up.
          </p>
        )}
        <Link href="/" className="btn btn-ghost" style={{ marginTop: 18, display: "inline-flex" }}>
          Back to site
        </Link>
      </section>
    );
  }

  return (
    <form onSubmit={submit} noValidate>
      <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1.05rem", margin: "0 0 14px" }}>
        Your details
      </h2>

      <div style={{ display: "grid", gap: 14 }}>
        <div>
          <label className="field-label" htmlFor="rf-name">Full name *</label>
          <input
            id="rf-name"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            required
          />
        </div>

        <div>
          <label className="field-label" htmlFor="rf-phone">Phone number *</label>
          <input
            id="rf-phone"
            className="input"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="tel"
            autoComplete="tel"
            placeholder="03001234567"
            required
          />
        </div>

        <div>
          <label className="field-label" htmlFor="rf-email">Email address *</label>
          <input
            id="rf-email"
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </div>

        {/* Honeypot: off-screen and hidden from assistive tech. Bots fill it. */}
        <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", width: 1, height: 1, overflow: "hidden" }}>
          <label htmlFor="rf-company">Company</label>
          <input
            id="rf-company"
            name="company"
            tabIndex={-1}
            autoComplete="off"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <p
          role="alert"
          style={{
            marginTop: 14,
            padding: "10px 14px",
            borderRadius: 8,
            background: "rgba(245,72,72,0.12)",
            border: "1px solid rgba(245,72,72,0.35)",
            color: "#F54848",
            fontSize: "0.9rem",
          }}
        >
          {error}
        </p>
      )}

      <button type="submit" className="btn btn-primary" style={{ marginTop: 18, width: "100%" }} disabled={busy}>
        {busy ? "Sending…" : "Submit request"}
      </button>

      <p style={{ marginTop: 12, color: "var(--text-muted)", fontSize: "0.82rem", textAlign: "center" }}>
        We only use these details to confirm your order. No payment is taken here.
      </p>
    </form>
  );
}
