"use client";

import { useState } from "react";

const SUCCESS_MESSAGE = "Your custom pricing request has been submitted successfully. Our team will contact you soon.";

type FormState = {
  fullName: string;
  email: string;
  whatsapp: string;
  companyName: string;
  teamSize: string;
  requiredTools: string;
  billingCycle: string;
  budget: string;
  message: string;
};

const EMPTY_FORM: FormState = {
  fullName: "",
  email: "",
  whatsapp: "",
  companyName: "",
  teamSize: "",
  requiredTools: "",
  billingCycle: "monthly",
  budget: "",
  message: "",
};

export default function CustomPricingPage() {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);

  function setField(key: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setNotice(null);

    try {
      const res = await fetch("/api/custom-pricing-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setNotice({ type: "error", message: body?.error || "Could not submit your request. Please try again." });
        return;
      }
      setForm(EMPTY_FORM);
      setNotice({ type: "success", message: SUCCESS_MESSAGE });
    } catch {
      setNotice({ type: "error", message: "Could not submit your request. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="v2-section">
      <div className="v2-container">
        <header className="v2-section-head">
          <p className="v2-eyebrow">Business bundles</p>
          <h1>Custom Pricing Request</h1>
          <p>Tell us what you need and our team will contact you with the best custom bundle price.</p>
        </header>

        <form className="surface-card custom-pricing-form" onSubmit={submit}>
          <div className="field">
            <label className="field-label" htmlFor="custom-full-name">Full name</label>
            <input id="custom-full-name" className="input" value={form.fullName} onChange={(event) => setField("fullName", event.target.value)} required />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="custom-email">Email</label>
            <input id="custom-email" className="input" type="email" value={form.email} onChange={(event) => setField("email", event.target.value)} required />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="custom-whatsapp">WhatsApp number</label>
            <input id="custom-whatsapp" className="input" value={form.whatsapp} onChange={(event) => setField("whatsapp", event.target.value)} required />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="custom-company">Company name / Business name optional</label>
            <input id="custom-company" className="input" value={form.companyName} onChange={(event) => setField("companyName", event.target.value)} />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="custom-team-size">Team size</label>
            <input id="custom-team-size" className="input" value={form.teamSize} onChange={(event) => setField("teamSize", event.target.value)} />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="custom-cycle">Monthly or yearly requirement</label>
            <select id="custom-cycle" className="input" value={form.billingCycle} onChange={(event) => setField("billingCycle", event.target.value)}>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          <div className="field custom-pricing-wide">
            <label className="field-label" htmlFor="custom-tools">Required tools / subscriptions</label>
            <input id="custom-tools" className="input" value={form.requiredTools} onChange={(event) => setField("requiredTools", event.target.value)} required />
          </div>
          <div className="field custom-pricing-wide">
            <label className="field-label" htmlFor="custom-budget">Budget optional</label>
            <input id="custom-budget" className="input" value={form.budget} onChange={(event) => setField("budget", event.target.value)} />
          </div>
          <div className="field custom-pricing-wide">
            <label className="field-label" htmlFor="custom-message">Message / requirements</label>
            <textarea id="custom-message" className="textarea input" rows={6} value={form.message} onChange={(event) => setField("message", event.target.value)} required />
          </div>

          {notice && (
            <p role={notice.type === "error" ? "alert" : "status"} className={`custom-pricing-notice ${notice.type}`}>
              {notice.message}
            </p>
          )}

          <div className="custom-pricing-actions">
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? "Submitting..." : "Submit request"}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .custom-pricing-form {
          width: min(860px, 100%);
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }
        .custom-pricing-wide,
        .custom-pricing-notice,
        .custom-pricing-actions {
          grid-column: 1 / -1;
        }
        .custom-pricing-notice {
          margin: 0;
          font-size: var(--fs-sm);
        }
        .custom-pricing-notice.success { color: var(--success-500); }
        .custom-pricing-notice.error { color: var(--danger-500); }
        .custom-pricing-actions {
          display: flex;
          justify-content: flex-end;
        }
        @media (max-width: 720px) {
          .custom-pricing-form { grid-template-columns: 1fr; }
          .custom-pricing-actions .btn { width: 100%; justify-content: center; }
        }
      `}</style>
    </section>
  );
}
