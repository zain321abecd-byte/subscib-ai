"use client";

import { useMemo, useState, useTransition } from "react";
import type { ContactMessageRow, ContactMessageStatus } from "@/lib/supabase/types";
import { updateContactMessageStatus } from "./actions";

const STATUS_LABELS: Record<ContactMessageStatus, string> = {
  unread: "Unread",
  read: "Read",
  resolved: "Resolved/replied",
};

const STATUS_CLASS: Record<ContactMessageStatus, string> = {
  unread: "admin-pill-pending",
  read: "admin-pill-paid",
  resolved: "admin-pill-delivered",
};

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function preview(value: string) {
  return value.length > 96 ? `${value.slice(0, 96).trim()}...` : value;
}

export default function ContactMessagesClient({ messages }: { messages: ContactMessageRow[] }) {
  const [rows, setRows] = useState(messages);
  const [selected, setSelected] = useState<ContactMessageRow | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const selectedRow = useMemo(
    () => rows.find((row) => row.id === selected?.id) || selected,
    [rows, selected],
  );

  function setStatus(row: ContactMessageRow, status: ContactMessageStatus) {
    setError("");
    setPendingId(row.id);
    startTransition(async () => {
      const res = await updateContactMessageStatus(row.id, status);
      setPendingId(null);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setRows((current) => current.map((item) => (item.id === row.id ? { ...item, status } : item)));
      setSelected((current) => (current?.id === row.id ? { ...current, status } : current));
    });
  }

  return (
    <>
      {error && (
        <div className="admin-card" style={{ background: "rgba(239,68,68,0.10)", borderColor: "rgba(239,68,68,0.30)", color: "#fca5a5", marginBottom: 14 }}>
          {error}
        </div>
      )}

      {rows.length === 0 ? (
        <div className="admin-card admin-empty">
          <i className="fa-solid fa-inbox"></i>
          <div>No contact messages yet.</div>
        </div>
      ) : (
        <div className="admin-card" style={{ padding: 0 }}>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Customer name</th>
                  <th>Email</th>
                  <th>Message preview</th>
                  <th>Status</th>
                  <th>Date/time</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.name}</td>
                    <td>
                      <a href={`mailto:${row.email}`} style={{ color: "var(--brand-300)" }}>{row.email}</a>
                    </td>
                    <td style={{ maxWidth: 420, color: "var(--text-muted)" }}>{preview(row.message)}</td>
                    <td><span className={`admin-pill ${STATUS_CLASS[row.status]}`}>{STATUS_LABELS[row.status]}</span></td>
                    <td style={{ whiteSpace: "nowrap" }}>{formatDate(row.created_at)}</td>
                    <td>
                      <button
                        type="button"
                        className="admin-btn admin-btn-ghost"
                        style={{ padding: "6px 12px" }}
                        onClick={() => setSelected(row)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedRow && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="contact-message-title"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 80,
            display: "grid",
            placeItems: "center",
            padding: 18,
            background: "rgba(0,0,0,0.58)",
          }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelected(null);
          }}
        >
          <div className="admin-card" style={{ width: "min(680px, 100%)", maxHeight: "88vh", overflow: "auto" }}>
            <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", gap: 14, marginBottom: 18 }}>
              <div>
                <h2 id="contact-message-title" style={{ fontFamily: "var(--font-heading)", fontSize: "1.2rem", color: "var(--text)", margin: 0 }}>
                  {selectedRow.name}
                </h2>
                <p style={{ color: "var(--text-muted)", margin: "4px 0 0" }}>{selectedRow.email}</p>
              </div>
              <button type="button" className="admin-btn admin-btn-ghost" style={{ padding: "7px 10px" }} onClick={() => setSelected(null)} aria-label="Close">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <span className="admin-label">Submitted date/time</span>
                <div style={{ color: "var(--text)" }}>{formatDate(selectedRow.created_at)}</div>
              </div>
              <div>
                <span className="admin-label">Status</span>
                <span className={`admin-pill ${STATUS_CLASS[selectedRow.status]}`}>{STATUS_LABELS[selectedRow.status]}</span>
              </div>
              <div>
                <span className="admin-label">Full message</span>
                <div style={{ whiteSpace: "pre-wrap", color: "var(--text)", lineHeight: 1.65, border: "1px solid var(--border)", borderRadius: 10, padding: 14, background: "var(--surface-2)" }}>
                  {selectedRow.message}
                </div>
              </div>
            </div>

            <div className="admin-form-actions" style={{ marginTop: 18 }}>
              <button
                type="button"
                className="admin-btn admin-btn-ghost"
                disabled={isPending || selectedRow.status === "read"}
                onClick={() => setStatus(selectedRow, "read")}
              >
                {pendingId === selectedRow.id && isPending ? <span className="admin-spinner" /> : <i className="fa-solid fa-envelope-open"></i>}
                Mark as read
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-primary"
                disabled={isPending || selectedRow.status === "resolved"}
                onClick={() => setStatus(selectedRow, "resolved")}
              >
                {pendingId === selectedRow.id && isPending ? <span className="admin-spinner" /> : <i className="fa-solid fa-circle-check"></i>}
                Mark as resolved/replied
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
