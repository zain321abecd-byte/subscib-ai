"use client";

import { useMemo, useState, useTransition } from "react";
import type { BusinessBundleInquiryRow, BusinessBundleInquiryStatus } from "@/lib/supabase/types";
import { updateBusinessBundleInquiry } from "./actions";

const STATUS_LABELS: Record<BusinessBundleInquiryStatus, string> = {
  new: "New",
  contacted: "Contacted",
  resolved: "Resolved",
  rejected: "Rejected",
};

const STATUS_OPTIONS = Object.keys(STATUS_LABELS) as BusinessBundleInquiryStatus[];

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function pillClass(status: BusinessBundleInquiryStatus) {
  if (status === "resolved") return "admin-pill-paid";
  if (status === "contacted") return "admin-pill-delivered";
  if (status === "rejected") return "admin-pill-failed";
  return "admin-pill-pending";
}

function preview(value: string, length = 72) {
  return value.length > length ? `${value.slice(0, length).trim()}...` : value;
}

export default function BusinessBundleInquiriesClient({
  inquiries,
  canWrite,
}: {
  inquiries: BusinessBundleInquiryRow[];
  canWrite: boolean;
}) {
  const [rows, setRows] = useState(inquiries);
  const [selected, setSelected] = useState<BusinessBundleInquiryRow | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const selectedRow = useMemo(
    () => rows.find((row) => row.id === selected?.id) || selected,
    [rows, selected],
  );

  function save(row: BusinessBundleInquiryRow, status: BusinessBundleInquiryStatus, adminNote: string) {
    setError("");
    startTransition(async () => {
      const result = await updateBusinessBundleInquiry({ id: row.id, status, adminNote });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setRows((current) => current.map((item) => item.id === row.id ? { ...item, status, admin_note: adminNote || null } : item));
      setSelected((current) => current?.id === row.id ? { ...current, status, admin_note: adminNote || null } : current);
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
          <i className="fa-solid fa-building-circle-check"></i>
          <div>No business bundle inquiries yet.</div>
        </div>
      ) : (
        <div className="admin-card" style={{ padding: 0 }}>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>WhatsApp</th>
                  <th>Company</th>
                  <th>Team size</th>
                  <th>Required tools</th>
                  <th>Status</th>
                  <th>Created date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.name}</td>
                    <td><a href={`mailto:${row.email}`} style={{ color: "var(--brand-300)" }}>{row.email}</a></td>
                    <td>{row.whatsapp}</td>
                    <td>{row.company_name}</td>
                    <td>{row.team_size}</td>
                    <td style={{ maxWidth: 260 }}>{preview(row.required_tools)}</td>
                    <td><span className={`admin-pill ${pillClass(row.status)}`}>{STATUS_LABELS[row.status]}</span></td>
                    <td style={{ whiteSpace: "nowrap" }}>{formatDate(row.created_at)}</td>
                    <td>
                      <button type="button" className="admin-btn admin-btn-ghost" style={{ padding: "6px 12px" }} onClick={() => setSelected(row)}>
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
        <InquiryModal row={selectedRow} canWrite={canWrite} pending={pending} onClose={() => setSelected(null)} onSave={save} />
      )}
    </>
  );
}

function InquiryModal({
  row,
  canWrite,
  pending,
  onClose,
  onSave,
}: {
  row: BusinessBundleInquiryRow;
  canWrite: boolean;
  pending: boolean;
  onClose: () => void;
  onSave: (row: BusinessBundleInquiryRow, status: BusinessBundleInquiryStatus, adminNote: string) => void;
}) {
  const [status, setStatus] = useState(row.status);
  const [note, setNote] = useState(row.admin_note || "");

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="business-inquiry-title" style={{ position: "fixed", inset: 0, zIndex: 80, display: "grid", placeItems: "center", padding: 18, background: "rgba(0,0,0,0.58)" }} onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <div className="admin-card" style={{ width: "min(780px, 100%)", maxHeight: "88vh", overflow: "auto" }}>
        <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", gap: 14, marginBottom: 18 }}>
          <div>
            <h2 id="business-inquiry-title" style={{ fontFamily: "var(--font-heading)", fontSize: "1.2rem", color: "var(--text)", margin: 0 }}>
              {row.company_name}
            </h2>
            <p style={{ color: "var(--text-muted)", margin: "4px 0 0" }}>{row.name} · {row.email} · {formatDate(row.created_at)}</p>
          </div>
          <button type="button" className="admin-btn admin-btn-ghost" style={{ padding: "7px 10px" }} onClick={onClose} aria-label="Close">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="admin-row cols-2">
          <Detail label="Name" value={row.name} />
          <Detail label="Email" value={<a href={`mailto:${row.email}`} style={{ color: "var(--brand-300)" }}>{row.email}</a>} />
          <Detail label="WhatsApp" value={row.whatsapp} />
          <Detail label="Company" value={row.company_name} />
          <Detail label="Team size" value={row.team_size} />
          <Detail label="Submitted date" value={formatDate(row.created_at)} />
        </div>

        <Block label="Required tools" value={row.required_tools} />
        <Block label="Message" value={row.message} />

        <div className="admin-row cols-2" style={{ marginTop: 14 }}>
          <label>
            <span className="admin-label">Status</span>
            <select className="admin-select" value={status} onChange={(event) => setStatus(event.target.value as BusinessBundleInquiryStatus)} disabled={!canWrite}>
              {STATUS_OPTIONS.map((option) => <option key={option} value={option}>{STATUS_LABELS[option]}</option>)}
            </select>
          </label>
        </div>

        <div style={{ marginTop: 14 }}>
          <span className="admin-label">Internal admin note</span>
          <textarea className="admin-textarea" rows={4} value={note} onChange={(event) => setNote(event.target.value)} disabled={!canWrite} />
        </div>

        {canWrite && (
          <div className="admin-form-actions" style={{ marginTop: 14 }}>
            <button type="button" className="admin-btn admin-btn-primary" disabled={pending} onClick={() => onSave(row, status, note)}>
              {pending ? "Saving..." : "Save updates"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <span className="admin-label">{label}</span>
      <div style={{ color: "var(--text)" }}>{value}</div>
    </div>
  );
}

function Block({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginTop: 14 }}>
      <span className="admin-label">{label}</span>
      <div style={{ whiteSpace: "pre-wrap", color: "var(--text)", lineHeight: 1.65, border: "1px solid var(--border)", borderRadius: 10, padding: 14, background: "var(--surface-2)" }}>
        {value}
      </div>
    </div>
  );
}
