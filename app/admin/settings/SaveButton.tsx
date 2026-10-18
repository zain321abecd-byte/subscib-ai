"use client";

import { useFormStatus } from "react-dom";

export default function SaveButton({
  label = "Save",
  savingLabel = "Saving...",
}: {
  label?: string;
  savingLabel?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={`admin-btn admin-btn-primary ${pending ? "is-saving" : ""}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        minWidth: "110px",
        cursor: pending ? "not-allowed" : "pointer",
        opacity: pending ? 0.75 : 1,
        transition: "all 0.15s ease",
      }}
    >
      {pending ? (
        <>
          <i className="fa-solid fa-spinner fa-spin"></i>
          <span>{savingLabel}</span>
        </>
      ) : (
        <>
          <i className="fa-solid fa-floppy-disk"></i>
          <span>{label}</span>
        </>
      )}
    </button>
  );
}
