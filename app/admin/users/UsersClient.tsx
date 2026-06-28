"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { apiBaseUrl } from "@/lib/api-client";

type Role = "superadmin" | "admin" | "manager" | "editor" | "customer";

type AdminUser = {
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

type Catalog = {
  roles: Role[];
  permissions: string[];
  groups: Array<{ label: string; keys: string[] }>;
  roleDefaults: Record<Role, string[]>;
};

export default function UsersClient() {
  const { user: me, accessToken, ready } = useAuth();
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const authHeaders = useMemo<Record<string, string>>(() => {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (accessToken) h.Authorization = `Bearer ${accessToken}`;
    return h;
  }, [accessToken]);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const base = apiBaseUrl();
      const [catRes, usersRes] = await Promise.all([
        fetch(`${base}/admin/users/catalog`, { headers: authHeaders }),
        fetch(`${base}/admin/users${search ? `?search=${encodeURIComponent(search)}` : ""}`, { headers: authHeaders }),
      ]);
      if (!catRes.ok) throw new Error((await catRes.json()).message || "Could not load permission catalog");
      if (!usersRes.ok) throw new Error((await usersRes.json()).message || "Could not load users");
      const catData = await catRes.json();
      const usersData = await usersRes.json();
      setCatalog(catData);
      setUsers(usersData.users || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [accessToken, authHeaders, search]);

  useEffect(() => { if (ready) load(); }, [ready, load]);

  // Gate: only users with users:read may reach this page.
  if (ready && me && !(me.effectivePermissions || []).includes("users:read") && me.role !== "superadmin") {
    return (
      <section style={{ padding: 32 }}>
        <h1>Access denied</h1>
        <p style={{ color: "var(--text-muted)" }}>You don&apos;t have permission to manage users.</p>
      </section>
    );
  }
  if (!ready || !accessToken) {
    return <section style={{ padding: 32 }}>Loading…</section>;
  }

  const canAssignRoles = me?.role === "superadmin" || (me?.effectivePermissions || []).includes("users:assign-roles");
  const canDelete = me?.role === "superadmin" || (me?.effectivePermissions || []).includes("users:delete");

  async function saveEdit() {
    if (!editing || !catalog) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${apiBaseUrl()}/admin/users/${editing.id}`, {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({
          role: editing.role,
          grant: editing.override.grant || [],
          revoke: editing.override.revoke || [],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Update failed");
      setToast(`Saved ${editing.email}`);
      setEditing(null);
      await load();
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
    try {
      const res = await fetch(`${apiBaseUrl()}/admin/users/${u.id}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Delete failed");
      setToast(`Deleted ${u.email}`);
      await load();
      setTimeout(() => setToast(null), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  // Compute the effective permission set for the currently-edited user, given
  // their role + grant/revoke override. Mirrors backend resolveEffectivePermissions().
  function effectiveForEdit(): Set<string> {
    if (!editing || !catalog) return new Set();
    const defaults = new Set(catalog.roleDefaults[editing.role] || []);
    (editing.override.grant || []).forEach((k) => defaults.add(k));
    (editing.override.revoke || []).forEach((k) => defaults.delete(k));
    return defaults;
  }

  function togglePermission(key: string) {
    if (!editing || !catalog) return;
    const isRoleDefault = (catalog.roleDefaults[editing.role] || []).includes(key);
    const grant = new Set(editing.override.grant || []);
    const revoke = new Set(editing.override.revoke || []);
    const effective = effectiveForEdit();

    if (effective.has(key)) {
      // Currently allowed → remove it
      if (isRoleDefault) revoke.add(key);
      grant.delete(key);
    } else {
      // Currently denied → allow it
      if (!isRoleDefault) grant.add(key);
      revoke.delete(key);
    }

    setEditing({
      ...editing,
      override: {
        grant: Array.from(grant),
        revoke: Array.from(revoke),
      },
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

      {loading ? (
        <div style={{ padding: 24, color: "var(--text-muted)" }}>Loading users…</div>
      ) : (
        <div style={{ overflowX: "auto", border: "1px solid var(--border)", borderRadius: 12 }}>
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
                  <td style={td}>{u.email}{u.id === me?.id ? <span style={{ color: "var(--brand-300)", marginLeft: 6, fontSize: 11 }}>(you)</span> : null}</td>
                  <td style={td}>{u.name || "—"}</td>
                  <td style={td}><RoleBadge role={u.role} /></td>
                  <td style={td}>{u.email_verified_at ? "✓" : <span style={{ color: "var(--warning-500, #b87800)" }}>pending</span>}</td>
                  <td style={td}>{u.last_login_at ? new Date(u.last_login_at).toLocaleString() : "—"}</td>
                  <td style={td}>
                    <button onClick={() => setEditing(u)} style={btn} disabled={!canAssignRoles}>Edit</button>
                    {canDelete && u.id !== me?.id && (
                      <button onClick={() => deleteUser(u)} style={{ ...btn, marginLeft: 6, color: "var(--danger-500, #c1121f)" }}>Delete</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit drawer */}
      {editing && catalog && (
        <div style={overlayStyle} onClick={() => setEditing(null)}>
          <div style={drawerStyle} onClick={(e) => e.stopPropagation()}>
            <header style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>Edit {editing.email}</h2>
              <button onClick={() => setEditing(null)} style={{ ...btn, padding: "4px 10px" }}>✕</button>
            </header>

            <div style={{ marginBottom: 16 }}>
              <label style={label}>Role</label>
              <select
                className="input"
                value={editing.role}
                onChange={(e) => setEditing({ ...editing, role: e.target.value as Role, override: { grant: [], revoke: [] } })}
                disabled={!canAssignRoles || (editing.id === me?.id)}
                style={{ width: "100%" }}
              >
                {catalog.roles.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>
                {editing.id === me?.id ? "You can't change your own role." : "Changing the role resets per-user overrides."}
              </p>
            </div>

            <div>
              <label style={label}>Permissions</label>
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 0, marginBottom: 12 }}>
                Default permissions for <strong>{editing.role}</strong> are pre-selected. Toggle to add or revoke per-user.
              </p>

              {catalog.groups.map((group) => {
                const eff = effectiveForEdit();
                return (
                  <fieldset key={group.label} style={{ marginBottom: 14, border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px" }}>
                    <legend style={{ padding: "0 6px", fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.4 }}>{group.label}</legend>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8 }}>
                      {group.keys.map((key) => {
                        const isOn = eff.has(key);
                        const isRoleDefault = (catalog.roleDefaults[editing.role] || []).includes(key);
                        return (
                          <label key={key} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: 6, borderRadius: 6, background: isOn ? "var(--brand-soft)" : "transparent" }}>
                            <input
                              type="checkbox"
                              checked={isOn}
                              onChange={() => togglePermission(key)}
                              disabled={!canAssignRoles}
                            />
                            <code style={{ fontSize: 12, color: isOn ? "var(--brand-300)" : "var(--text-muted)" }}>{key}</code>
                            {isRoleDefault && <small style={{ marginLeft: "auto", color: "var(--text-muted)", fontSize: 11 }}>default</small>}
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>
                );
              })}
            </div>

            <footer style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
              <button onClick={() => setEditing(null)} style={btn} disabled={saving}>Cancel</button>
              <button onClick={saveEdit} style={{ ...btn, background: "var(--brand-500)", color: "#fff", borderColor: "var(--brand-500)" }} disabled={saving || !canAssignRoles}>
                {saving ? "Saving…" : "Save changes"}
              </button>
            </footer>
          </div>
        </div>
      )}
    </section>
  );
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
const btn: React.CSSProperties = {
  padding: "6px 12px",
  background: "transparent",
  border: "1px solid var(--border)",
  borderRadius: 6,
  color: "var(--text)",
  cursor: "pointer",
  fontSize: 13,
};
const label: React.CSSProperties = { display: "block", marginBottom: 6, fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.4 };
const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.55)",
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "center",
  zIndex: 1000,
  overflow: "auto",
  padding: "60px 16px",
};
const drawerStyle: React.CSSProperties = {
  background: "var(--bg, #0f1019)",
  border: "1px solid var(--border)",
  borderRadius: 14,
  padding: 20,
  width: "100%",
  maxWidth: 720,
};
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
