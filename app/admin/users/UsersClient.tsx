"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateUserRole, deleteUserAction } from "./actions";

export type Role = "superadmin" | "admin" | "manager" | "editor" | "customer";

export type AdminUser = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: Role;
  override: { grant?: string[]; revoke?: string[] };
  effectivePermissions: string[];
  email_verified_at: string | null;
  last_login_at: string | null;
  created_at: string;
};

export type Catalog = {
  roles: Role[];
  permissions: string[];
  groups: Array<{ label: string; keys: string[] }>;
  roleDefaults: Record<Role, string[]>;
};

export default function UsersClient({
  initialUsers,
  catalog,
  meEmail,
  canAssignRoles,
  canDelete,
  loadError,
}: {
  initialUsers: AdminUser[];
  catalog: Catalog;
  meEmail: string | null;
  canAssignRoles: boolean;
  canDelete: boolean;
  loadError: string | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(loadError);
  const [toast, setToast] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);

  const isSelf = (u: { email: string }) =>
    !!meEmail && u.email.toLowerCase() === meEmail.toLowerCase();

  const [activeCategory, setActiveCategory] = useState<string>(catalog.groups[0]?.label || "");
  const activeGroup = catalog.groups.find((g) => g.label === activeCategory) || catalog.groups[0];
  const isSuperadmin = editing?.role === "superadmin";

  function openEditor(u: AdminUser) {
    setActiveCategory(catalog.groups[0]?.label || "");
    setEditing(u);
  }

  const users = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return initialUsers;
    return initialUsers.filter(
      (u) =>
        u.email.toLowerCase().includes(term) ||
        (u.name || "").toLowerCase().includes(term),
    );
  }, [initialUsers, search]);

  async function saveEdit() {
    if (!editing) return;
    setSaving(true);
    setError(null);
    try {
      const res = await updateUserRole({
        userId: editing.id,
        role: editing.role,
        grant: editing.override.grant || [],
        revoke: editing.override.revoke || [],
      });
      if (!res.ok) throw new Error(res.error);
      setToast(`Saved ${editing.email}`);
      setEditing(null);
      startTransition(() => router.refresh());
      setTimeout(() => setToast(null), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function deleteUser(u: AdminUser) {
    if (!canDelete) return;
    if (!confirm(`Delete user ${u.email}? This cannot be undone.`)) return;
    setError(null);
    try {
      const res = await deleteUserAction(u.id);
      if (!res.ok) throw new Error(res.error);
      setToast(`Deleted ${u.email}`);
      startTransition(() => router.refresh());
      setTimeout(() => setToast(null), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  // Effective permission set for the edited user (role defaults ⊕ grant − revoke).
  function effectiveForEdit(): Set<string> {
    if (!editing) return new Set();
    const defaults = new Set(catalog.roleDefaults[editing.role] || []);
    (editing.override.grant || []).forEach((k) => defaults.add(k));
    (editing.override.revoke || []).forEach((k) => defaults.delete(k));
    return defaults;
  }

  function togglePermission(key: string) {
    if (!editing) return;
    const isRoleDefault = (catalog.roleDefaults[editing.role] || []).includes(key);
    const grant = new Set(editing.override.grant || []);
    const revoke = new Set(editing.override.revoke || []);
    const effective = effectiveForEdit();

    if (effective.has(key)) {
      if (isRoleDefault) revoke.add(key);
      grant.delete(key);
    } else {
      if (!isRoleDefault) grant.add(key);
      revoke.delete(key);
    }

    setEditing({
      ...editing,
      override: { grant: Array.from(grant), revoke: Array.from(revoke) },
    });
  }

  return (
    <section style={{ padding: 24 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24 }}>Team & permissions</h1>
          <p style={{ margin: "4px 0 0", color: "var(--text-muted)", fontSize: 14 }}>
            {users.length} user{users.length === 1 ? "" : "s"}. Click a row to edit role and permissions.
          </p>
        </div>
        <input
          className="input"
          placeholder="Search email or name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 280 }}
        />
      </header>

      {toast && <div style={toastStyle}>{toast}</div>}
      {error && <div style={errorStyle}>{error}</div>}

      <div style={{ overflowX: "auto", border: "1px solid var(--border)", borderRadius: 12, opacity: isPending ? 0.6 : 1 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ background: "var(--surface)", color: "var(--text-muted)", textAlign: "left" }}>
              <th style={th}>Email</th>
              <th style={th}>Name</th>
              <th style={th}>Role</th>
              <th style={th}>Verified</th>
              <th style={th}>Last login</th>
              <th style={th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} style={{ borderTop: "1px solid var(--border)" }}>
                <td style={td}>{u.email}{isSelf(u) ? <span style={{ color: "var(--brand-300)", marginLeft: 6, fontSize: 11 }}>(you)</span> : null}</td>
                <td style={td}>{u.name || "—"}</td>
                <td style={td}><RoleBadge role={u.role} /></td>
                <td style={td}>{u.email_verified_at ? "✓" : <span style={{ color: "var(--warning-500, #b87800)" }}>pending</span>}</td>
                <td style={td}>{u.last_login_at ? new Date(u.last_login_at).toLocaleString() : "—"}</td>
                <td style={td}>
                  <button onClick={() => openEditor(u)} style={iconBtn} disabled={!canAssignRoles} title="Edit role & permissions" aria-label="Edit role & permissions">
                    <i className="fa-solid fa-gear" />
                  </button>
                  {canDelete && !isSelf(u) && (
                    <button onClick={() => deleteUser(u)} style={{ ...iconBtn, marginLeft: 6, color: "var(--danger-500, #c1121f)" }} title="Delete user" aria-label="Delete user">
                      <i className="fa-solid fa-trash" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td style={{ ...td, color: "var(--text-muted)" }} colSpan={6}>No users found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Permissions modal */}
      {editing && activeGroup && (
        <div style={overlayStyle} onClick={() => setEditing(null)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div style={modalHeader}>
              <div style={{ minWidth: 0 }}>
                <div style={modalKicker}>Manage permissions</div>
                <div style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {editing.email}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <select
                  value={editing.role}
                  onChange={(e) => setEditing({ ...editing, role: e.target.value as Role, override: { grant: [], revoke: [] } })}
                  disabled={!canAssignRoles || isSelf(editing)}
                  style={lightSelect}
                  title={isSelf(editing) ? "You can't change your own role." : "Changing the role resets per-user overrides."}
                >
                  {catalog.roles.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                <button onClick={() => setEditing(null)} style={closeBtn} aria-label="Close">
                  <i className="fa-solid fa-xmark" />
                </button>
              </div>
            </div>

            {/* Body: categories + cards */}
            <div style={modalBody}>
              <aside style={sidebar}>
                {catalog.groups.map((g) => {
                  const active = g.label === activeGroup.label;
                  return (
                    <button key={g.label} type="button" onClick={() => setActiveCategory(g.label)} style={categoryBtn(active)}>
                      <i className={`fa-solid ${groupIcon(g.label)}`} style={{ color: CORAL, width: 18, textAlign: "center" }} />
                      <span>{g.label}</span>
                    </button>
                  );
                })}
              </aside>

              <main style={panel}>
                {isSuperadmin ? (
                  <div style={superadminNotice}>
                    <i className="fa-solid fa-shield-halved" style={{ color: CORAL }} />
                    <span>Superadmins always have full access. Permissions are locked to prevent accidentally locking out an owner.</span>
                  </div>
                ) : (
                  <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginBottom: 14 }}>
                    Defaults for <strong style={{ color: "var(--text-soft)" }}>{editing.role}</strong> are pre-selected. Toggle to grant or revoke per user.
                  </div>
                )}
                <div style={{ display: "grid", gap: 12 }}>
                  {activeGroup.keys.map((key) => {
                    const eff = effectiveForEdit();
                    const isOn = isSuperadmin ? true : eff.has(key);
                    const isRoleDefault = (catalog.roleDefaults[editing.role] || []).includes(key);
                    const meta = permMeta(key);
                    return (
                      <div key={key} style={{ ...cardStyle, opacity: isSuperadmin ? 0.7 : 1 }}>
                        <div style={cardIcon}><i className={`fa-solid ${meta.icon}`} /></div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>{meta.title}</span>
                            {isRoleDefault && !isSuperadmin && <span style={defaultPill}>default</span>}
                          </div>
                          <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>{meta.desc}</div>
                        </div>
                        <Toggle on={isOn} disabled={!canAssignRoles || isSuperadmin} onChange={() => togglePermission(key)} />
                      </div>
                    );
                  })}
                </div>
              </main>
            </div>

            {/* Footer */}
            <div style={modalFooter}>
              <button onClick={() => setEditing(null)} style={cancelBtn} disabled={saving}>Cancel</button>
              <button onClick={saveEdit} disabled={saving || !canAssignRoles} style={saveBtn(saving || !canAssignRoles)}>
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

const CORAL = "var(--brand-500)";

function Toggle({ on, disabled, onChange }: { on: boolean; disabled?: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={onChange}
      style={{
        flexShrink: 0,
        width: 48,
        height: 28,
        borderRadius: 999,
        border: "none",
        padding: 3,
        cursor: disabled ? "not-allowed" : "pointer",
        background: on ? CORAL : "rgba(255,255,255,0.16)",
        opacity: disabled ? 0.55 : 1,
        transition: "background .18s ease",
        display: "inline-flex",
        alignItems: "center",
      }}
    >
      <span
        style={{
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: "#fff",
          boxShadow: "0 1px 3px rgba(0,0,0,.3)",
          transform: on ? "translateX(20px)" : "translateX(0)",
          transition: "transform .18s ease",
        }}
      />
    </button>
  );
}

const GROUP_ICONS: Record<string, string> = {
  "Products": "fa-box",
  "Orders & revenue": "fa-receipt",
  "Blog": "fa-newspaper",
  "Reviews": "fa-star",
  "Freebies": "fa-gift",
  "Stock": "fa-boxes-stacked",
  "Settings": "fa-gear",
  "Users": "fa-users-gear",
  "Analytics": "fa-chart-line",
};
const groupIcon = (label: string) => GROUP_ICONS[label] || "fa-folder";

const ACTION_META: Record<string, { label: string; desc: string; icon: string }> = {
  read: { label: "Read", desc: "View and list records", icon: "fa-eye" },
  write: { label: "Write", desc: "Create and edit records", icon: "fa-pen-to-square" },
  delete: { label: "Delete", desc: "Permanently remove records", icon: "fa-trash" },
  refund: { label: "Refund", desc: "Issue refunds on orders", icon: "fa-rotate-left" },
  revenue: { label: "Revenue", desc: "See revenue figures", icon: "fa-coins" },
  moderate: { label: "Moderate", desc: "Approve or hide submissions", icon: "fa-gavel" },
  "assign-roles": { label: "Assign roles", desc: "Change roles & permissions", icon: "fa-user-shield" },
  view: { label: "View", desc: "Access analytics & reports", icon: "fa-chart-simple" },
};
function permMeta(key: string): { title: string; desc: string; icon: string } {
  const action = key.split(":")[1] || key;
  const m = ACTION_META[action];
  if (m) return { title: m.label, desc: m.desc, icon: m.icon };
  return { title: action, desc: `Access to ${key}`, icon: "fa-circle-dot" };
}

function RoleBadge({ role }: { role: Role }) {
  const colors: Record<Role, { bg: string; fg: string }> = {
    superadmin: { bg: "#7c2d12", fg: "#fff5e0" },
    admin: { bg: "#3730a3", fg: "#e0e7ff" },
    manager: { bg: "#065f46", fg: "#d1fae5" },
    editor: { bg: "#374151", fg: "#e5e7eb" },
    customer: { bg: "transparent", fg: "var(--text-muted)" },
  };
  const c = colors[role];
  return (
    <span style={{ background: c.bg, color: c.fg, padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4 }}>
      {role}
    </span>
  );
}

const th: React.CSSProperties = { padding: "10px 12px", fontWeight: 600, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.4 };
const td: React.CSSProperties = { padding: "10px 12px" };
const iconBtn: React.CSSProperties = {
  width: 34,
  height: 34,
  display: "inline-grid",
  placeItems: "center",
  padding: 0,
  background: "transparent",
  border: "1px solid var(--border)",
  borderRadius: 8,
  color: "var(--text)",
  cursor: "pointer",
  fontSize: 13,
};
const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(17, 19, 24, 0.55)",
  backdropFilter: "blur(2px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
  overflow: "auto",
  padding: "32px 16px",
};

// ── Permissions modal (admin dark theme) ──────────────────────────────────────
const modalStyle: React.CSSProperties = {
  background: "var(--surface)",
  color: "var(--text)",
  border: "1px solid var(--border)",
  borderRadius: 18,
  width: "100%",
  maxWidth: 1000,
  maxHeight: "88vh",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  boxShadow: "0 30px 70px rgba(0,0,0,0.4)",
};
const modalHeader: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
  padding: "18px 22px",
  borderBottom: "1px solid var(--border)",
  flexShrink: 0,
};
const modalKicker: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: 1,
  textTransform: "uppercase",
  color: "var(--text-soft)",
};
const lightSelect: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 9,
  border: "1px solid var(--border)",
  background: "var(--bg)",
  color: "var(--text)",
  fontSize: 13,
  textTransform: "capitalize",
  cursor: "pointer",
};
const closeBtn: React.CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 9,
  border: "1px solid var(--border)",
  background: "transparent",
  color: "var(--text-muted)",
  cursor: "pointer",
  fontSize: 15,
};
const modalBody: React.CSSProperties = {
  display: "flex",
  minHeight: 0,
  flex: 1,
  overflow: "hidden",
};
const sidebar: React.CSSProperties = {
  width: 232,
  flexShrink: 0,
  borderRight: "1px solid var(--border)",
  padding: 14,
  overflowY: "auto",
};
const categoryBtn = (active: boolean): React.CSSProperties => ({
  width: "100%",
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "12px 14px",
  marginBottom: 8,
  borderRadius: 12,
  cursor: "pointer",
  textAlign: "left",
  fontSize: 14,
  fontWeight: 600,
  border: active ? `1.5px solid ${CORAL}` : "1px solid var(--border)",
  background: active ? "var(--brand-soft)" : "transparent",
  color: active ? "var(--brand-300)" : "var(--text-soft)",
});
const panel: React.CSSProperties = {
  flex: 1,
  minHeight: 0,
  padding: 20,
  overflowY: "auto",
  background: "var(--bg)",
};
const cardStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  padding: "16px 18px",
  border: "1px solid var(--border)",
  borderRadius: 14,
  background: "var(--surface)",
};
const cardIcon: React.CSSProperties = {
  width: 38,
  height: 38,
  flexShrink: 0,
  borderRadius: 10,
  display: "grid",
  placeItems: "center",
  background: "var(--brand-soft)",
  color: CORAL,
  fontSize: 15,
};
const superadminNotice: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  marginBottom: 14,
  padding: "12px 14px",
  borderRadius: 10,
  border: "1px solid var(--border)",
  background: "var(--brand-soft)",
  color: "var(--text-soft)",
  fontSize: 13,
};
const defaultPill: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: 0.4,
  textTransform: "uppercase",
  color: "var(--text-muted)",
  background: "rgba(255,255,255,0.08)",
  borderRadius: 999,
  padding: "2px 8px",
};
const modalFooter: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "14px 22px",
  borderTop: "1px solid var(--border)",
  flexShrink: 0,
};
const cancelBtn: React.CSSProperties = {
  background: "none",
  border: "none",
  fontWeight: 700,
  fontSize: 13,
  letterSpacing: 0.5,
  textTransform: "uppercase",
  color: "var(--text-soft)",
  cursor: "pointer",
};
const saveBtn = (disabled: boolean): React.CSSProperties => ({
  background: disabled ? "rgba(255,255,255,0.12)" : CORAL,
  color: disabled ? "var(--text-muted)" : "#fff",
  border: "none",
  borderRadius: 9,
  padding: "11px 22px",
  fontWeight: 700,
  fontSize: 13,
  letterSpacing: 0.5,
  textTransform: "uppercase",
  cursor: disabled ? "not-allowed" : "pointer",
});
const toastStyle: React.CSSProperties = {
  position: "fixed",
  top: 80,
  right: 24,
  background: "#10b981",
  color: "#fff",
  padding: "10px 16px",
  borderRadius: 8,
  fontSize: 14,
  zIndex: 1100,
};
const errorStyle: React.CSSProperties = {
  background: "rgba(220, 38, 38, 0.12)",
  border: "1px solid rgba(220, 38, 38, 0.4)",
  color: "#fca5a5",
  padding: "10px 14px",
  borderRadius: 8,
  marginBottom: 14,
  fontSize: 13,
};
