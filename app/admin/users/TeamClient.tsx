"use client";

/**
 * Team-management screen — matches the "Users" screenshot the user
 * shared. The layout is two columns:
 *   • left: group list (Admins / Managers / Editors / …) with member
 *     avatars stacked underneath. Clicking a group opens the edit
 *     drawer for its permissions + membership.
 *   • right (drawer/modal): invite form and group editor.
 *
 * The one non-obvious thing: portal users appear in ZERO or MORE
 * groups. So "which group is this user in?" is a many-to-many
 * question. The screenshot renders users as pills under each group
 * they belong to (with an "INVITE NOT ACCEPTED" chip for pending
 * ones). We do the same.
 */
import { useMemo, useState } from "react";
import { apiBaseUrl, portalAuthHeaders } from "@/lib/api-client";

export type PortalUserDto = {
  id: string;
  email: string;
  name: string | null;
  status: "invited" | "active" | "disabled";
  is_superadmin: boolean;
  invite_sent_at: string | null;
  invite_accepted_at: string | null;
  last_login_at: string | null;
  created_at: string;
  groups?: Array<{ id: string; name: string }>;
};

export type PortalGroupDto = {
  id: string;
  name: string;
  description: string | null;
  permissions: string[];
  is_system: boolean;
  member_count: number;
  members?: Array<{ id: string; email: string; name: string | null; status: string }>;
};

type Catalog = {
  permissions: string[];
  groups: Array<{ label: string; keys: string[] }>;
};

type Me = { id: string; email: string; isSuper: boolean };

async function api<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${apiBaseUrl()}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(await portalAuthHeaders()) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || data?.error || `${method} ${path} → ${res.status}`);
  return data as T;
}

function initials(u: { name?: string | null; email: string }) {
  const src = (u.name || u.email).trim();
  const parts = src.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return src.slice(0, 2).toUpperCase();
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }); }
  catch { return iso; }
}

// ─────────────────────────────────────────────────────────────────────

export default function TeamClient({
  me,
  initialUsers,
  initialGroups,
  catalog,
}: {
  me: Me;
  initialUsers: PortalUserDto[];
  initialGroups: PortalGroupDto[];
  catalog: Catalog;
}) {
  const [users, setUsers] = useState<PortalUserDto[]>(initialUsers);
  const [groups, setGroups] = useState<PortalGroupDto[]>(initialGroups);
  const [flash, setFlash] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<PortalGroupDto | null>(null);
  const [editingUser, setEditingUser] = useState<PortalUserDto | null>(null);

  // Users not currently in any group — surfaced as a "No group" row so
  // superadmins don't lose track of freshly-invited teammates.
  const ungrouped = useMemo(() => users.filter((u) => !u.groups || u.groups.length === 0), [users]);

  function notify(kind: "ok" | "err", msg: string) {
    setFlash({ kind, msg });
    setTimeout(() => setFlash(null), 4000);
  }

  async function refreshAll() {
    try {
      const [{ users: u }, { groups: g }] = await Promise.all([
        api<{ users: PortalUserDto[] }>("GET", "/admin/portal-users"),
        api<{ groups: PortalGroupDto[] }>("GET", "/admin/portal-groups"),
      ]);
      setUsers(u);
      setGroups(g);
    } catch (err: any) {
      notify("err", err.message || "Refresh failed.");
    }
  }

  // ─── actions ───────────────────────────────────────────────────────
  async function submitInvite(input: { email: string; name: string; groupIds: string[] }) {
    try {
      await api("POST", "/admin/portal-users", {
        email: input.email,
        name: input.name || undefined,
        group_ids: input.groupIds,
      });
      notify("ok", `Invite sent to ${input.email}.`);
      setInviteOpen(false);
      await refreshAll();
    } catch (err: any) {
      notify("err", err.message || "Invite failed.");
    }
  }

  async function resend(userId: string) {
    try {
      await api("POST", `/admin/portal-users/${userId}/resend-invite`, {});
      notify("ok", "Invite resent.");
      await refreshAll();
    } catch (err: any) { notify("err", err.message); }
  }

  async function setUserStatus(u: PortalUserDto, status: "active" | "disabled") {
    try {
      await api("PATCH", `/admin/portal-users/${u.id}`, { status });
      notify("ok", `${u.email} ${status === "active" ? "enabled" : "disabled"}.`);
      await refreshAll();
    } catch (err: any) { notify("err", err.message); }
  }

  async function toggleSuper(u: PortalUserDto) {
    try {
      await api("PATCH", `/admin/portal-users/${u.id}`, { is_superadmin: !u.is_superadmin });
      notify("ok", `${u.email} is${u.is_superadmin ? " no longer" : " now"} a superadmin.`);
      await refreshAll();
    } catch (err: any) { notify("err", err.message); }
  }

  async function removeUser(u: PortalUserDto) {
    if (!confirm(`Delete ${u.email}? This can't be undone.`)) return;
    try {
      await api("DELETE", `/admin/portal-users/${u.id}`);
      notify("ok", `${u.email} deleted.`);
      await refreshAll();
    } catch (err: any) { notify("err", err.message); }
  }

  async function saveGroup(input: { id?: string; name: string; description: string; permissions: string[]; memberIds: string[] }) {
    try {
      let groupId = input.id;
      if (!groupId) {
        const { group } = await api<{ group: PortalGroupDto }>("POST", "/admin/portal-groups", {
          name: input.name, description: input.description || null, permissions: input.permissions,
        });
        groupId = group.id;
      } else {
        await api("PATCH", `/admin/portal-groups/${groupId}`, {
          name: input.name, description: input.description || null, permissions: input.permissions,
        });
      }
      await api("POST", `/admin/portal-groups/${groupId}/members`, { user_ids: input.memberIds });
      notify("ok", `Group "${input.name}" saved.`);
      setEditingGroup(null);
      await refreshAll();
    } catch (err: any) { notify("err", err.message); }
  }

  async function deleteGroup(g: PortalGroupDto) {
    if (g.is_system) { notify("err", "Built-in groups can't be deleted."); return; }
    if (!confirm(`Delete group "${g.name}"?`)) return;
    try {
      await api("DELETE", `/admin/portal-groups/${g.id}`);
      notify("ok", "Group deleted.");
      setEditingGroup(null);
      await refreshAll();
    } catch (err: any) { notify("err", err.message); }
  }

  // ─── render ────────────────────────────────────────────────────────
  return (
    <div>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "1.65rem", margin: "0 0 4px" }}>Team & permissions</h1>
          <p style={{ color: "var(--text-muted)", margin: 0, fontSize: "0.92rem" }}>
            Invite teammates and control which sections of the admin portal they can access.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="admin-btn admin-btn-ghost" onClick={() => setEditingGroup({ id: "", name: "", description: null, permissions: [], is_system: false, member_count: 0, members: [] })}>
            <i className="fa-solid fa-plus" /> New group
          </button>
          <button className="admin-btn admin-btn-primary" onClick={() => setInviteOpen(true)}>
            <i className="fa-solid fa-user-plus" /> Invite teammate
          </button>
        </div>
      </header>

      {flash && (
        <div className={`admin-flash admin-flash-${flash.kind}`} style={{
          padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: "0.9rem",
          background: flash.kind === "ok" ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
          color: flash.kind === "ok" ? "#22c55e" : "#ef4444",
          border: `1px solid ${flash.kind === "ok" ? "rgba(34,197,94,0.35)" : "rgba(239,68,68,0.35)"}`,
        }}>
          {flash.msg}
        </div>
      )}

      <div style={{ display: "grid", gap: 16 }}>
        {groups.map((g) => (
          <GroupCard
            key={g.id}
            group={g}
            allUsers={users}
            onEdit={() => setEditingGroup(g)}
            onResend={resend}
            onDelete={g.is_system ? undefined : () => deleteGroup(g)}
            onClickUser={(u) => setEditingUser(u)}
          />
        ))}
        {ungrouped.length > 0 && (
          <div style={{ background: "var(--surface)", borderRadius: 12, border: "1px solid var(--border)", padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div>
                <div style={{ fontWeight: 600 }}>Not in any group</div>
                <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: 2 }}>
                  These teammates can log in but see nothing until you add them to a group.
                </div>
              </div>
            </div>
            <MemberList
              users={ungrouped}
              onResend={resend}
              onClick={(u) => setEditingUser(u)}
            />
          </div>
        )}
      </div>

      {inviteOpen && (
        <InviteModal
          groups={groups}
          existingUsers={users}
          onClose={() => setInviteOpen(false)}
          onSubmit={submitInvite}
        />
      )}
      {editingGroup && (
        <GroupModal
          group={editingGroup}
          allUsers={users}
          catalog={catalog}
          onClose={() => setEditingGroup(null)}
          onSave={saveGroup}
          onDelete={editingGroup.id && !editingGroup.is_system ? () => deleteGroup(editingGroup) : undefined}
        />
      )}
      {editingUser && (
        <UserModal
          user={editingUser}
          me={me}
          onClose={() => setEditingUser(null)}
          onResend={resend}
          onToggleSuper={toggleSuper}
          onStatus={setUserStatus}
          onDelete={removeUser}
        />
      )}
    </div>
  );
}

// ─── group card ──────────────────────────────────────────────────────
function GroupCard({
  group, allUsers, onEdit, onResend, onDelete, onClickUser,
}: {
  group: PortalGroupDto;
  allUsers: PortalUserDto[];
  onEdit: () => void;
  onResend: (userId: string) => void;
  onDelete?: () => void;
  onClickUser: (u: PortalUserDto) => void;
}) {
  const members = group.members || [];
  // Cross-ref against the top-level users list to get status, etc.
  const memberFull: PortalUserDto[] = members
    .map((m) => allUsers.find((u) => u.id === m.id))
    .filter(Boolean) as PortalUserDto[];

  return (
    <section style={{ background: "var(--surface)", borderRadius: 12, border: "1px solid var(--border)", padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <h2 style={{ margin: 0, fontSize: "1.05rem", fontFamily: "var(--font-heading)" }}>{group.name}</h2>
            {group.is_system && <span style={pillStyle("neutral")}>BUILT-IN</span>}
            <span style={pillStyle("muted")}>{memberFull.length} {memberFull.length === 1 ? "member" : "members"}</span>
            <span style={pillStyle("muted")}>{group.permissions.length} permissions</span>
          </div>
          {group.description && <p style={{ color: "var(--text-muted)", margin: "6px 0 0", fontSize: "0.85rem" }}>{group.description}</p>}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="admin-btn admin-btn-ghost" onClick={onEdit}><i className="fa-solid fa-pen" /> Edit</button>
          {onDelete && <button className="admin-btn admin-btn-ghost" onClick={onDelete} style={{ color: "#ef4444" }}><i className="fa-solid fa-trash" /></button>}
        </div>
      </div>

      {memberFull.length === 0 ? (
        <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", padding: "8px 4px" }}>No members yet.</div>
      ) : (
        <MemberList users={memberFull} onResend={onResend} onClick={onClickUser} />
      )}
    </section>
  );
}

function MemberList({
  users, onResend, onClick,
}: { users: PortalUserDto[]; onResend: (id: string) => void; onClick: (u: PortalUserDto) => void }) {
  return (
    <div style={{ display: "grid", gap: 6 }}>
      {users.map((u) => (
        <div
          key={u.id}
          onClick={() => onClick(u)}
          role="button"
          tabIndex={0}
          style={{
            display: "flex", alignItems: "center", gap: 12, padding: "8px 10px",
            borderRadius: 8, background: "var(--surface-2, rgba(255,255,255,0.03))",
            cursor: "pointer", border: "1px solid transparent",
          }}
          onKeyDown={(e) => { if (e.key === "Enter") onClick(u); }}
        >
          <div style={{
            width: 34, height: 34, borderRadius: "50%",
            background: "linear-gradient(135deg, #f97316, #fb923c)",
            display: "grid", placeItems: "center", color: "#fff",
            fontWeight: 700, fontSize: 12, flexShrink: 0,
          }}>{initials(u)}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontWeight: 600 }}>{u.name || u.email}</span>
              {u.is_superadmin && <span style={pillStyle("gold")}>SUPERADMIN</span>}
              {u.status === "invited" && <span style={pillStyle("warn")}>INVITE NOT ACCEPTED</span>}
              {u.status === "disabled" && <span style={pillStyle("neutral")}>DISABLED</span>}
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              {u.email}
              {u.status === "active" && <> · last login {fmtDate(u.last_login_at)}</>}
              {u.status === "invited" && <> · invited {fmtDate(u.invite_sent_at)}</>}
            </div>
          </div>
          {u.status === "invited" && (
            <button
              className="admin-btn admin-btn-ghost"
              onClick={(e) => { e.stopPropagation(); onResend(u.id); }}
              style={{ fontSize: "0.8rem" }}
            >
              <i className="fa-solid fa-paper-plane" /> Resend
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── invite modal ────────────────────────────────────────────────────
function InviteModal({
  groups, existingUsers, onClose, onSubmit,
}: {
  groups: PortalGroupDto[];
  existingUsers: PortalUserDto[];
  onClose: () => void;
  onSubmit: (input: { email: string; name: string; groupIds: string[] }) => Promise<void>;
}) {
  const [mode, setMode] = useState<"new" | "existing">("new");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [pickedExisting, setPickedExisting] = useState<string>("");
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const eligibleExisting = existingUsers.filter((u) => u.status !== "active");

  function toggleGroup(id: string) {
    setGroupIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  async function submit() {
    setErr(null);
    let target = { email: email.trim(), name: name.trim() };
    if (mode === "existing") {
      const picked = existingUsers.find((u) => u.id === pickedExisting);
      if (!picked) { setErr("Pick a user."); return; }
      target = { email: picked.email, name: picked.name || "" };
    } else if (!target.email) { setErr("Enter an email address."); return; }
    if (groupIds.length === 0) { setErr("Pick at least one group so they see something once they accept."); return; }
    setBusy(true);
    try { await onSubmit({ email: target.email, name: target.name, groupIds }); }
    finally { setBusy(false); }
  }

  return (
    <ModalShell onClose={onClose} title="Invite teammate">
      <div style={{ display: "flex", gap: 6, marginBottom: 16, background: "var(--surface-2, rgba(255,255,255,0.04))", padding: 4, borderRadius: 8 }}>
        <button className={`admin-btn ${mode === "new" ? "admin-btn-primary" : "admin-btn-ghost"}`} style={{ flex: 1 }} onClick={() => setMode("new")}>New email</button>
        <button className={`admin-btn ${mode === "existing" ? "admin-btn-primary" : "admin-btn-ghost"}`} style={{ flex: 1 }} onClick={() => setMode("existing")} disabled={eligibleExisting.length === 0}>
          Existing teammate ({eligibleExisting.length})
        </button>
      </div>

      {mode === "new" ? (
        <div style={{ display: "grid", gap: 12 }}>
          <label style={labelStyle}>Email
            <input className="admin-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="alex@subscribai.com" />
          </label>
          <label style={labelStyle}>Name (optional)
            <input className="admin-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex Chen" />
          </label>
        </div>
      ) : (
        <label style={labelStyle}>Choose teammate
          <select className="admin-input" value={pickedExisting} onChange={(e) => setPickedExisting(e.target.value)}>
            <option value="">— Pick someone —</option>
            {eligibleExisting.map((u) => (
              <option key={u.id} value={u.id}>{u.name ? `${u.name} · ${u.email}` : u.email} — {u.status}</option>
            ))}
          </select>
        </label>
      )}

      <div style={{ marginTop: 18 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Assign groups</div>
        <div style={{ display: "grid", gap: 6, maxHeight: 220, overflowY: "auto" }}>
          {groups.map((g) => (
            <label key={g.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: 10, border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer" }}>
              <input type="checkbox" checked={groupIds.includes(g.id)} onChange={() => toggleGroup(g.id)} style={{ marginTop: 3 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{g.name}</div>
                <div style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
                  {g.description || `${g.permissions.length} permissions`}
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {err && <div style={{ color: "#ef4444", fontSize: "0.85rem", marginTop: 12 }}>{err}</div>}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
        <button className="admin-btn admin-btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
        <button className="admin-btn admin-btn-primary" onClick={submit} disabled={busy}>
          {busy ? "Sending…" : "Send invite"}
        </button>
      </div>
    </ModalShell>
  );
}

// ─── group modal ─────────────────────────────────────────────────────
function GroupModal({
  group, allUsers, catalog, onClose, onSave, onDelete,
}: {
  group: PortalGroupDto;
  allUsers: PortalUserDto[];
  catalog: Catalog;
  onClose: () => void;
  onSave: (input: { id?: string; name: string; description: string; permissions: string[]; memberIds: string[] }) => Promise<void>;
  onDelete?: () => void;
}) {
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description || "");
  const [permissions, setPermissions] = useState<string[]>(group.permissions);
  const [memberIds, setMemberIds] = useState<string[]>((group.members || []).map((m) => m.id));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const isNew = !group.id;

  function togglePerm(k: string) {
    setPermissions((prev) => prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]);
  }
  function toggleMember(id: string) {
    setMemberIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }
  function toggleGroupBulk(keys: string[]) {
    setPermissions((prev) => {
      const allOn = keys.every((k) => prev.includes(k));
      return allOn ? prev.filter((k) => !keys.includes(k)) : Array.from(new Set([...prev, ...keys]));
    });
  }

  async function submit() {
    setErr(null);
    if (!name.trim()) { setErr("Name is required."); return; }
    setBusy(true);
    try {
      await onSave({
        id: group.id || undefined,
        name: name.trim(),
        description: description.trim(),
        permissions,
        memberIds,
      });
    } finally { setBusy(false); }
  }

  return (
    <ModalShell onClose={onClose} title={isNew ? "New group" : `Edit "${group.name}"`}>
      <div style={{ display: "grid", gap: 12 }}>
        <label style={labelStyle}>Name
          <input className="admin-input" value={name} onChange={(e) => setName(e.target.value)} disabled={group.is_system} />
        </label>
        <label style={labelStyle}>Description
          <input className="admin-input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional — helps teammates understand who this is for." />
        </label>
      </div>

      <div style={{ marginTop: 18 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Permissions</div>
        <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", margin: "0 0 10px" }}>
          Members of this group get every permission checked here. Superadmins bypass this list entirely.
        </p>
        <div style={{ display: "grid", gap: 12 }}>
          {catalog.groups.map((section) => {
            const allOn = section.keys.every((k) => permissions.includes(k));
            const someOn = section.keys.some((k) => permissions.includes(k));
            return (
              <div key={section.label} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ fontWeight: 600 }}>{section.label}</div>
                  <button
                    type="button"
                    className="admin-btn admin-btn-ghost"
                    style={{ fontSize: "0.8rem" }}
                    onClick={() => toggleGroupBulk(section.keys)}
                  >
                    {allOn ? "Uncheck all" : someOn ? "Check all" : "Check all"}
                  </button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 6 }}>
                  {section.keys.map((k) => (
                    <label key={k} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.88rem" }}>
                      <input type="checkbox" checked={permissions.includes(k)} onChange={() => togglePerm(k)} />
                      <code style={{ fontSize: "0.8rem" }}>{k}</code>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ marginTop: 18 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Members</div>
        <div style={{ display: "grid", gap: 4, maxHeight: 200, overflowY: "auto", border: "1px solid var(--border)", borderRadius: 8, padding: 8 }}>
          {allUsers.length === 0 && <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>No teammates yet — invite some first.</div>}
          {allUsers.map((u) => (
            <label key={u.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 6px", borderRadius: 6, cursor: "pointer" }}>
              <input type="checkbox" checked={memberIds.includes(u.id)} onChange={() => toggleMember(u.id)} />
              <span style={{ flex: 1 }}>{u.name || u.email}</span>
              <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>{u.email}</span>
              {u.status === "invited" && <span style={pillStyle("warn")}>invited</span>}
            </label>
          ))}
        </div>
      </div>

      {err && <div style={{ color: "#ef4444", fontSize: "0.85rem", marginTop: 12 }}>{err}</div>}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 18 }}>
        <div>
          {onDelete && <button className="admin-btn admin-btn-ghost" style={{ color: "#ef4444" }} onClick={onDelete}><i className="fa-solid fa-trash" /> Delete group</button>}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="admin-btn admin-btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="admin-btn admin-btn-primary" onClick={submit} disabled={busy}>{busy ? "Saving…" : (isNew ? "Create group" : "Save changes")}</button>
        </div>
      </div>
    </ModalShell>
  );
}

// ─── per-user modal ──────────────────────────────────────────────────
function UserModal({
  user, me, onClose, onResend, onToggleSuper, onStatus, onDelete,
}: {
  user: PortalUserDto;
  me: Me;
  onClose: () => void;
  onResend: (id: string) => void;
  onToggleSuper: (u: PortalUserDto) => void;
  onStatus: (u: PortalUserDto, s: "active" | "disabled") => void;
  onDelete: (u: PortalUserDto) => void;
}) {
  const isSelf = user.id === me.id;
  return (
    <ModalShell onClose={onClose} title={user.name || user.email}>
      <div style={{ display: "grid", gap: 8, marginBottom: 18 }}>
        <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Email</div>
        <div>{user.email}</div>
      </div>
      <div style={{ display: "grid", gap: 8, marginBottom: 18 }}>
        <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Status</div>
        <div>
          {user.status === "invited" && <span style={pillStyle("warn")}>INVITE NOT ACCEPTED</span>}
          {user.status === "active" && <span style={pillStyle("ok")}>ACTIVE</span>}
          {user.status === "disabled" && <span style={pillStyle("neutral")}>DISABLED</span>}
          {user.is_superadmin && <span style={{ ...pillStyle("gold"), marginLeft: 8 }}>SUPERADMIN</span>}
        </div>
      </div>
      <div style={{ display: "grid", gap: 8, marginBottom: 18 }}>
        <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Groups</div>
        <div>{(user.groups || []).map((g) => g.name).join(", ") || "—"}</div>
      </div>
      <div style={{ display: "grid", gap: 8, marginBottom: 18 }}>
        <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Timeline</div>
        <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
          Invited {fmtDate(user.invite_sent_at)} · Accepted {fmtDate(user.invite_accepted_at)} · Last login {fmtDate(user.last_login_at)}
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {user.status === "invited" && (
          <button className="admin-btn admin-btn-primary" onClick={() => onResend(user.id)}>
            <i className="fa-solid fa-paper-plane" /> Resend invite
          </button>
        )}
        {me.isSuper && !isSelf && (
          <button className="admin-btn admin-btn-ghost" onClick={() => onToggleSuper(user)}>
            {user.is_superadmin ? "Revoke superadmin" : "Grant superadmin"}
          </button>
        )}
        {!isSelf && user.status !== "disabled" && (
          <button className="admin-btn admin-btn-ghost" onClick={() => onStatus(user, "disabled")}>Disable</button>
        )}
        {user.status === "disabled" && (
          <button className="admin-btn admin-btn-ghost" onClick={() => onStatus(user, "active")}>Enable</button>
        )}
        {me.isSuper && !isSelf && (
          <button className="admin-btn admin-btn-ghost" style={{ color: "#ef4444" }} onClick={() => onDelete(user)}>
            <i className="fa-solid fa-trash" /> Delete
          </button>
        )}
      </div>
    </ModalShell>
  );
}

// ─── generic modal shell ─────────────────────────────────────────────
function ModalShell({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
        display: "grid", placeItems: "center", padding: 20, zIndex: 100,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--surface)", borderRadius: 14, border: "1px solid var(--border)",
          maxWidth: 720, width: "100%", maxHeight: "88vh", overflowY: "auto",
          padding: 24, boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h2 style={{ margin: 0, fontFamily: "var(--font-heading)", fontSize: "1.2rem" }}>{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 20, cursor: "pointer" }}
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── style helpers ───────────────────────────────────────────────────
const labelStyle: React.CSSProperties = { display: "grid", gap: 6, fontSize: "0.88rem", color: "var(--text-muted)" };

function pillStyle(kind: "ok" | "warn" | "gold" | "muted" | "neutral"): React.CSSProperties {
  const bg = {
    ok:      "rgba(34,197,94,0.15)",
    warn:    "rgba(245,158,11,0.15)",
    gold:    "rgba(249,115,22,0.18)",
    muted:   "rgba(255,255,255,0.06)",
    neutral: "rgba(255,255,255,0.08)",
  }[kind];
  const color = {
    ok: "#22c55e",
    warn: "#f59e0b",
    gold: "#f97316",
    muted: "var(--text-muted)",
    neutral: "var(--text-muted)",
  }[kind];
  return {
    display: "inline-block", padding: "2px 8px", borderRadius: 999,
    fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.03em",
    background: bg, color,
  };
}
