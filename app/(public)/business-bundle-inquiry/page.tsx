"use client";

import { useState } from "react";

type FormState = {
  name: string;
  email: string;
  whatsapp: string;
  companyName: string;
  teamSize: string;
  requiredTools: string;
  message: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  email: "",
  whatsapp: "",
  companyName: "",
  teamSize: "",
  requiredTools: "",
  message: "",
};

export default function BusinessBundleInquiryPage() {
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
      const res = await fetch("/api/business-bundle-inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setNotice({ type: "error", message: body?.error || "Could not submit your inquiry. Please try again." });
        return;
      }
      setForm(EMPTY_FORM);
      setNotice({ type: "success", message: "Your business bundle inquiry has been submitted successfully. Our team will contact you soon." });
    } catch {
      setNotice({ type: "error", message: "Could not submit your inquiry. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="v2-section">
      <div className="v2-container">
        <header className="v2-section-head">
          <p className="v2-eyebrow">Business bundles</p>
          <h1>Contact Sales</h1>
          <p>Tell us your team size and required tools. We will prepare a custom bundle price for you.</p>
        </header>

        <form className="surface-card business-inquiry-form" onSubmit={submit}>
          <Field id="business-name" label="Name" value={form.name} onChange={(value) => setField("name", value)} required />
          <Field id="business-email" label="Email" type="email" value={form.email} onChange={(value) => setField("email", value)} required />
          <Field id="business-whatsapp" label="WhatsApp" value={form.whatsapp} onChange={(value) => setField("whatsapp", value)} required />
          <Field id="business-company" label="Company name" value={form.companyName} onChange={(value) => setField("companyName", value)} required />
          <Field id="business-team-size" label="Team size" value={form.teamSize} onChange={(value) => setField("teamSize", value)} required />
          <div className="field business-inquiry-wide">
            <label className="field-label" htmlFor="business-tools">Required tools</label>
            <input
              id="business-tools"
              className="input"
              value={form.requiredTools}
              onChange={(event) => setField("requiredTools", event.target.value)}
              placeholder="ChatGPT, Claude, Canva, Semrush..."
              required
            />
          </div>
          <div className="field business-inquiry-wide">
            <label className="field-label" htmlFor="business-message">Message</label>
            <textarea
              id="business-message"
              className="textarea input"
              rows={6}
              value={form.message}
              onChange={(event) => setField("message", event.target.value)}
              required
            />
          </div>

          {notice && (
            <p role={notice.type === "error" ? "alert" : "status"} className={`business-inquiry-notice ${notice.type}`}>
              {notice.message}
            </p>
          )}

          <div className="business-inquiry-actions">
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? "Submitting..." : "Submit inquiry"}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .business-inquiry-form {
          width: min(860px, 100%);
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }
        .business-inquiry-wide,
        .business-inquiry-notice,
        .business-inquiry-actions {
          grid-column: 1 / -1;
        }
        .business-inquiry-notice {
          margin: 0;
          font-size: var(--fs-sm);
        }
        .business-inquiry-notice.success { color: var(--success-500); }
        .business-inquiry-notice.error { color: var(--danger-500); }
        .business-inquiry-actions {
          display: flex;
          justify-content: flex-end;
        }
        @media (max-width: 720px) {
          .business-inquiry-form { grid-template-columns: 1fr; }
          .business-inquiry-actions .btn { width: 100%; justify-content: center; }
        }
      `}</style>
    </section>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>{label}</label>
      <input id={id} className="input" type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} />
    </div>
  );
}
