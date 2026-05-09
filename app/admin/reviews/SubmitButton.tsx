"use client";

import { useFormStatus } from "react-dom";

export default function SubmitButton({
  label,
  pendingLabel,
}: {
  label: string;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="admin-btn admin-btn-primary"
      disabled={pending}
      aria-busy={pending}
      style={{ display: "inline-flex", alignItems: "center", gap: 10 }}
    >
      {pending && <span className="admin-spinner" aria-hidden="true" />}
      {pending ? (pendingLabel ?? `${label}…`) : label}
    </button>
  );
}
