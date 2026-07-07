"use client";

import { useMemo, useState } from "react";

export type CustomerContact = {
  email: string;
  name: string;
  phones: string[];
  orderCount: number;
  paidOrderCount: number;
  latestOrderAt: string;
  firstOrderAt: string;
  lastOrderNumber: string;
  lastStatus: string;
  source: string;
};

function csvCell(value: string | number) {
  const s = String(value ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function dateLabel(value: string) {
  return new Date(value).toLocaleString();
}

function statusClass(status: string) {
  if (status === "paid" || status === "delivered") return "admin-pill-paid";
  if (status === "failed") return "admin-pill-failed";
  if (status === "refunded") return "admin-pill-refunded";
  if (status === "cancelled") return "admin-pill-cancelled";
  return "admin-pill-pending";
}

function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function CustomerContactsClient({ contacts }: { contacts: CustomerContact[] }) {
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((contact) => {
      return [
        contact.email,
        contact.name,
        contact.phones.join(" "),
        contact.lastOrderNumber,
        contact.lastStatus,
        contact.source,
      ].some((value) => value.toLowerCase().includes(q));
    });
  }, [contacts, query]);

  const emails = useMemo(() => filtered.map((contact) => contact.email), [filtered]);
  const phones = useMemo(() => [...new Set(filtered.flatMap((contact) => contact.phones))], [filtered]);

  async function copyText(label: string, values: string[]) {
    const text = values.join("\n");
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setToast(`${label} copied (${values.length}).`);
    window.setTimeout(() => setToast(""), 3000);
  }

  function downloadCsv() {
    const header = [
      "email",
      "name",
      "phones",
      "order_count",
      "paid_order_count",
      "latest_order_at",
      "first_order_at",
      "last_order_number",
      "last_status",
      "source",
    ];
    const rows = filtered.map((contact) => [
      contact.email,
      contact.name,
      contact.phones.join(" | "),
      contact.orderCount,
      contact.paidOrderCount,
      contact.latestOrderAt,
      contact.firstOrderAt,
      contact.lastOrderNumber,
      contact.lastStatus,
      contact.source,
    ]);
    const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
    download("subscribai-customer-contacts.csv", csv, "text/csv;charset=utf-8");
    setToast(`CSV downloaded (${filtered.length} contacts).`);
    window.setTimeout(() => setToast(""), 3000);
  }

  return (
    <>
      {toast && (
        <div className="admin-card" style={{ marginBottom: 14, borderColor: "rgba(34,197,94,0.30)", color: "#86efac" }}>
          {toast}
        </div>
      )}

      <section className="admin-stats" style={{ marginBottom: 16 }}>
        <div className="admin-stat">
          <div className="admin-stat-label">Unique emails</div>
          <div className="admin-stat-value">{contacts.length}</div>
          <div className="admin-stat-meta">from checkout orders</div>
        </div>
        <div className="admin-stat">
          <div className="admin-stat-label">Customer numbers</div>
          <div className="admin-stat-value">{new Set(contacts.flatMap((contact) => contact.phones)).size}</div>
          <div className="admin-stat-meta">deduplicated phone/WhatsApp numbers</div>
        </div>
        <div className="admin-stat">
          <div className="admin-stat-label">Paid contacts</div>
          <div className="admin-stat-value">{contacts.filter((contact) => contact.paidOrderCount > 0).length}</div>
          <div className="admin-stat-meta">contacts with at least one paid order</div>
        </div>
        <div className="admin-stat">
          <div className="admin-stat-label">Filtered</div>
          <div className="admin-stat-value">{filtered.length}</div>
          <div className="admin-stat-meta">matching current search</div>
        </div>
      </section>

      <section className="admin-card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 260px" }}>
            <input
              className="input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search email, name, phone, order, status, source..."
              style={{ width: "100%" }}
            />
          </div>
          <button type="button" className="admin-btn admin-btn-ghost" onClick={() => copyText("Emails", emails)} disabled={emails.length === 0}>
            <i className="fa-solid fa-copy"></i> Copy emails
          </button>
          <button type="button" className="admin-btn admin-btn-ghost" onClick={() => copyText("Numbers", phones)} disabled={phones.length === 0}>
            <i className="fa-solid fa-phone"></i> Copy numbers
          </button>
          <button type="button" className="admin-btn admin-btn-primary" onClick={downloadCsv} disabled={filtered.length === 0}>
            <i className="fa-solid fa-file-csv"></i> Download CSV
          </button>
        </div>
      </section>

      {filtered.length === 0 ? (
        <div className="admin-card admin-empty">
          <i className="fa-solid fa-address-book"></i>
          <div>No checkout contacts found.</div>
        </div>
      ) : (
        <div className="admin-card" style={{ padding: 0 }}>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Phone / WhatsApp</th>
                  <th>Orders</th>
                  <th>Status</th>
                  <th>Source</th>
                  <th>Latest order</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((contact) => (
                  <tr key={contact.email}>
                    <td>
                      <strong style={{ color: "var(--text)" }}>{contact.name || "Customer"}</strong>
                      <div style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>{contact.email}</div>
                    </td>
                    <td>
                      {contact.phones.length ? (
                        contact.phones.map((phone) => (
                          <div key={phone} style={{ whiteSpace: "nowrap" }}>{phone}</div>
                        ))
                      ) : (
                        <span style={{ color: "var(--text-muted)" }}>No number</span>
                      )}
                    </td>
                    <td>
                      <strong style={{ color: "var(--text)" }}>{contact.orderCount}</strong>
                      <div style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>{contact.paidOrderCount} paid</div>
                    </td>
                    <td><span className={`admin-pill ${statusClass(contact.lastStatus)}`}>{contact.lastStatus}</span></td>
                    <td>{contact.source || <span style={{ color: "var(--text-muted)" }}>direct</span>}</td>
                    <td>
                      <code>{contact.lastOrderNumber}</code>
                      <div style={{ color: "var(--text-muted)", fontSize: "0.78rem", whiteSpace: "nowrap" }}>
                        {dateLabel(contact.latestOrderAt)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
