"use client";

import { useState } from "react";

type SubmitState =
  | { type: "idle"; message: "" }
  | { type: "success"; message: string }
  | { type: "error"; message: string };

const SUCCESS_MESSAGE = "Your message has been sent successfully. Our team will contact you soon.";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [state, setState] = useState<SubmitState>({ type: "idle", message: "" });
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanName = name.trim();
    const cleanEmail = email.trim();
    const cleanMessage = message.trim();

    if (!cleanName) {
      setState({ type: "error", message: "Please enter your name." });
      return;
    }
    if (!cleanEmail || !isValidEmail(cleanEmail)) {
      setState({ type: "error", message: "Please enter a valid email address." });
      return;
    }
    if (!cleanMessage) {
      setState({ type: "error", message: "Please enter your message." });
      return;
    }

    setSubmitting(true);
    setState({ type: "idle", message: "" });

    try {
      const res = await fetch("/api/contact-messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: cleanName, email: cleanEmail, message: cleanMessage }),
      });
      const body = await res.json().catch(() => null);

      if (!res.ok) {
        setState({
          type: "error",
          message: body?.error || "We couldn't send your message. Please try again.",
        });
        return;
      }

      setName("");
      setEmail("");
      setMessage("");
      setState({ type: "success", message: SUCCESS_MESSAGE });
    } catch {
      setState({ type: "error", message: "We couldn't send your message. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: "var(--space-3)" }}>
      <div className="field">
        <label className="field-label" htmlFor="contact-name">Name</label>
        <input
          id="contact-name"
          className="input"
          placeholder="Your name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
      </div>
      <div className="field">
        <label className="field-label" htmlFor="contact-email">Email</label>
        <input
          id="contact-email"
          className="input"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </div>
      <div className="field">
        <label className="field-label" htmlFor="contact-message">Message</label>
        <textarea
          id="contact-message"
          className="textarea input"
          rows={5}
          placeholder="How can we help?"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          required
        />
      </div>
      <button type="submit" className="btn btn-primary" disabled={submitting}>
        {submitting ? "Sending..." : "Send message"}
      </button>
      {state.message && (
        <p
          role={state.type === "error" ? "alert" : "status"}
          style={{
            margin: 0,
            color: state.type === "success" ? "var(--success-500)" : "var(--danger-500)",
            fontSize: "var(--fs-sm)",
          }}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
