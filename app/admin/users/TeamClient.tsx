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

/**
 * Human-readable labels + icons for the permission catalog. Keeps the
 * modal readable — nobody wants to stare at "products:write" all day.
 * Keys not listed here fall back to the raw permission key.
 */
const PERMISSION_LABELS: Record<string, { label: string; hint?: string }> = {
  "products:read":     { label: "View products" },
  "products:write":    { label: "Create & edit products" },
  "products:delete":   { label: "Delete products" },
  "orders:read":       { label: "View orders" },
  "orders:write":      { label: "Update order status" },
  "orders:refund":     { label: "Process refunds" },
  "orders:revenue":    { label: "See revenue figures", hint: "Sensitive — sales totals, MRR" },
  "blog:read":         { label: "View blog posts" },
  "blog:write":        { label: "Create & edit posts" },
  "blog:delete":       { label: "Delete posts" },
  "reviews:read":      { label: "View reviews" },
  "reviews:moderate":  { label: "Approve / hide reviews" },
  "reviews:delete":    { label: "Delete reviews" },
  "freebies:read":     { label: "View freebies" },
  "freebies:write":    { label: "Manage freebies" },
  "freebies:delete":   { label: "Delete freebies" },
  "stock:read":        { label: "View stock levels" },
  "stock:write":       { label: "Update stock" },
  "settings:read":     { label: "View settings" },
  "settings:write":    { label: "Change settings", hint: "Payment keys, SMTP, site config" },
  "emails:read":       { label: "View email history" },
  "emails:send":       { label: "Send emails" },
  "users:read":        { label: "View team page" },
  "users:write":       { label: "Invite & manage teammates", hint: "Can add / remove group members" },
  "analytics:view":    { label: "View analytics" },
};

const SECTION_ICONS: Record<string, string> = {
  "Products": "fa-box",
  "Orders & revenue": "fa-receipt",
  "Blog": "fa-newspaper",
  "Reviews": "fa-star",
  "Freebies": "fa-gift",
  "Stock": "fa-boxes-stacked",
  "Settings": "fa-sliders",
  "Emails": "fa-envelope",
  "Users": "fa-users-gear",
  "Analytics": "fa-chart-line",
};

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
  // Which group the invite modal is scoped to. Setting this to a group opens
  // the modal — the group ID is baked in so the modal doesn't ask "which group?".
  const [inviteFor, setInviteFor] = useState<PortalGroupDto | null>(null);
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
      setInviteFor(null);
      await refreshAll();
    } catch (err: any) {
      notify("err", err.message || "Invite failed.");
    }
  }

  /**
   * Add an existing portal user to a group. Handy when the user was
   * invited into group A but now needs to also see group B — the
   * per-group + button opens the invite modal with a "pick existing"
   * tab that calls this instead of firing a fresh invite email.
   */
  async function addExistingToGroup(userId: string, groupId: string) {
    try {
      await api("POST", `/admin/portal-groups/${groupId}/members/${userId}`, {});
      notify("ok", "Added to group.");
      setInviteFor(null);
      await refreshAll();
    } catch (err: any) { notify("err", err.message); }
  }

  /** Remove a user from a single group (leaves the account intact). */
  async function removeFromGroup(groupId: string, userId: string, email: string) {
    if (!confirm(`Remove ${email} from this group?`)) return;
    try {
      await api("DELETE", `/admin/portal-groups/${groupId}/members/${userId}`);
      notify("ok", "Removed from group.");
      await refreshAll();
    } catch (err: any) { notify("err", err.message); }
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
  const totalPermissions = catalog.permissions.length;

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
          <button className="admin-btn admin-btn-primary" onClick={() => setEditingGroup({ id: "", name: "", description: null, permissions: [], is_system: false, member_count: 0, members: [] })}>
            <i className="fa-solid fa-plus" /> New group
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

      <div style={{ display: "grid", gap: 12 }}>
        {groups.map((g) => (
          <GroupCard
            key={g.id}
            group={g}
            allUsers={users}
            totalPermissions={totalPermissions}
            onInvite={() => setInviteFor(g)}
            onEdit={() => setEditingGroup(g)}
            onDelete={g.is_system ? undefined : () => deleteGroup(g)}
            onClickUser={(u) => setEditingUser(u)}
            onRemoveMember={(u) => removeFromGroup(g.id, u.id, u.email)}
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
              onClick={(u) => setEditingUser(u)}
              onRemove={undefined}
            />
          </div>
        )}
      </div>

      {inviteFor && (
        <InviteModal
          group={inviteFor}
          existingUsers={users}
          onClose={() => setInviteFor(null)}
          onSubmit={(input) => submitInvite({ ...input, groupIds: [inviteFor.id] })}
          onAddExisting={(userId) => addExistingToGroup(userId, inviteFor.id)}
        />
      )}
      {editingGroup && (
        <GroupModal
          group={editingGroup}
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
  group, allUsers, totalPermissions, onInvite, onEdit, onDelete, onClickUser, onRemoveMember,
}: {
  group: PortalGroupDto;
  allUsers: PortalUserDto[];
  totalPermissions: number;
  onInvite: () => void;
  onEdit: () => void;
  onDelete?: () => void;
  onClickUser: (u: PortalUserDto) => void;
  onRemoveMember: (u: PortalUserDto) => void;
}) {
  const members = group.members || [];
  // Cross-ref against the top-level users list to get status, etc. — the
  // /admin/portal-groups payload gives us a stripped-down member shape.
  const memberFull: PortalUserDto[] = members
    .map((m) => allUsers.find((u) => u.id === m.id))
    .filter(Boolean) as PortalUserDto[];

  const hasAllPermissions = group.permissions.length === totalPermissions;

  return (
    <section style={{ background: "var(--surface)", borderRadius: 10, border: "1px solid var(--border)", overflow: "hidden" }}>
      {/* Header bar — tinted background, group name + inline actions on the right. */}
      <div
        style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "10px 14px",
          background: "var(--surface-2, rgba(255,255,255,0.03))",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <i className="fa-solid fa-users" style={{ color: "var(--text-muted)", fontSize: 13 }} />
        <div style={{ fontWeight: 700, letterSpacing: "0.06em", fontSize: "0.82rem", textTransform: "uppercase" }}>
          {group.name}
        </div>
        {group.is_system && (
          <span style={{ ...pillStyle("neutral"), fontSize: "0.62rem" }}>BUILT-IN</span>
        )}
        <div style={{ flex: 1 }} />
        {hasAllPermissions && (
          <span style={{
            padding: "3px 10px", borderRadius: 4,
            border: "1px solid var(--border)",
            fontSize: "0.68rem", letterSpacing: "0.06em", fontWeight: 700,
            color: "var(--text-muted)",
          }}>
            ALL PERMISSIONS
          </span>
        )}
        <IconBtn icon="fa-plus" title="Invite teammate to this group" onClick={onInvite} accent />
        <IconBtn icon="fa-gear" title="Edit permissions" onClick={onEdit} />
        {onDelete && <IconBtn icon="fa-trash" title="Delete group" onClick={onDelete} danger />}
      </div>

      {/* Body — member rows or empty state. */}
      {memberFull.length === 0 ? (
        <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", padding: "14px 16px", fontStyle: "italic" }}>
          No users in this group
        </div>
      ) : (
        <MemberList
          users={memberFull}
          onClick={onClickUser}
          onRemove={onRemoveMember}
        />
      )}
    </section>
  );
}

/** Small round action button used in each group's header. */
function IconBtn({
  icon, onClick, title, accent, danger,
}: { icon: string; onClick: () => void; title: string; accent?: boolean; danger?: boolean }) {
  const color = danger ? "#ef4444" : accent ? "#f97316" : "var(--text-muted)";
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      title={title}
      aria-label={title}
      style={{
        width: 30, height: 30, borderRadius: 6,
        display: "grid", placeItems: "center",
        background: "transparent",
        border: "1px solid var(--border)",
        color, cursor: "pointer",
        fontSize: 12,
      }}
    >
      <i className={`fa-solid ${icon}`} />
    </button>
  );
}

/**
 * Flat member rows — matches the screenshot: user icon, name (or the
 * "INVITE NOT ACCEPTED" pill if pending), then the email pushed to the
 * right, and a red trash icon that removes them from the *group*
 * (not the account). Clicking the row itself opens the user drawer.
 */
function MemberList({
  users, onClick, onRemove,
}: {
  users: PortalUserDto[];
  onClick: (u: PortalUserDto) => void;
  /** Undefined when the row shouldn't offer a "remove from group" action (e.g. the ungrouped list). */
  onRemove: ((u: PortalUserDto) => void) | undefined;
}) {
  return (
    <div>
      {users.map((u, i) => (
        <div
          key={u.id}
          onClick={() => onClick(u)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === "Enter") onClick(u); }}
          style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "10px 16px",
            borderTop: i === 0 ? "none" : "1px solid var(--border)",
            cursor: "pointer",
          }}
        >
          <i className="fa-solid fa-user" style={{ color: "var(--text-muted)", fontSize: 12, width: 14 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0, flexWrap: "wrap" }}>
            {u.status === "invited" ? (
              <span style={pillStyle("warn")}>INVITE NOT ACCEPTED</span>
            ) : (
              <span style={{ fontWeight: 500 }}>{u.name || u.email.split("@")[0]}</span>
            )}
            {u.is_superadmin && <span style={pillStyle("gold")}>SUPERADMIN</span>}
            {u.status === "disabled" && <span style={pillStyle("neutral")}>DISABLED</span>}
          </div>
          <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>{u.email}</div>
          {onRemove && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onRemove(u); }}
              title="Remove from group"
              aria-label="Remove from group"
              style={{
                width: 28, height: 28, borderRadius: 6,
                display: "grid", placeItems: "center",
                background: "transparent", border: "none",
                color: "#ef4444", cursor: "pointer",
              }}
            >
              <i className="fa-solid fa-trash" style={{ fontSize: 12 }} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Group-scoped invite modal. The target group is fixed (comes from
 * whichever "+" was clicked on the group header), so there's no group
 * picker inside — just email + name, plus an "or pick existing
 * teammate" tab that adds an already-invited person to this group
 * without sending a fresh invite email.
 */
function InviteModal({
  group, existingUsers, onClose, onSubmit, onAddExisting,
}: {
  group: PortalGroupDto;
  existingUsers: PortalUserDto[];
  onClose: () => void;
  onSubmit: (input: { email: string; name: string }) => Promise<void>;
  onAddExisting: (userId: string) => Promise<void>;
}) {
  const [mode, setMode] = useState<"new" | "existing">("new");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [pickedExisting, setPickedExisting] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Existing portal users who aren't already members of THIS group.
  const alreadyIn = new Set((group.members || []).map((m) => m.id));
  const eligibleExisting = existingUsers.filter((u) => !alreadyIn.has(u.id));

  async function submit() {
    setErr(null);
    setBusy(true);
    try {
      if (mode === "existing") {
        if (!pickedExisting) { setErr("Pick a teammate."); setBusy(false); return; }
        await onAddExisting(pickedExisting);
      } else {
        if (!email.trim()) { setErr("Enter an email address."); setBusy(false); return; }
        await onSubmit({ email: email.trim(), name: name.trim() });
      }
    } finally { setBusy(false); }
  }

  return (
    <ModalShell onClose={onClose} title={`Invite to ${group.name}`}>
      <p style={{ color: "var(--text-muted)", margin: "0 0 16px", fontSize: "0.88rem" }}>
        They'll get {group.permissions.length} permission{group.permissions.length === 1 ? "" : "s"} as soon as they accept.
      </p>

      <div style={{ display: "flex", gap: 6, marginBottom: 16, background: "var(--surface-2, rgba(255,255,255,0.04))", padding: 4, borderRadius: 8 }}>
        <button className={`admin-btn ${mode === "new" ? "admin-btn-primary" : "admin-btn-ghost"}`} style={{ flex: 1 }} onClick={() => setMode("new")}>
          New email
        </button>
        <button
          className={`admin-btn ${mode === "existing" ? "admin-btn-primary" : "admin-btn-ghost"}`}
          style={{ flex: 1 }}
          onClick={() => setMode("existing")}
          disabled={eligibleExisting.length === 0}
        >
          Existing teammate ({eligibleExisting.length})
        </button>
      </div>

      {mode === "new" ? (
        <div style={{ display: "grid", gap: 12 }}>
          <label style={labelStyle}>Email
            <input className="admin-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="alex@subscribai.com" autoFocus />
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

      {err && <div style={{ color: "#ef4444", fontSize: "0.85rem", marginTop: 12 }}>{err}</div>}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
        <button className="admin-btn admin-btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
        <button className="admin-btn admin-btn-primary" onClick={submit} disabled={busy}>
          {busy ? (mode === "existing" ? "Adding…" : "Sending…") : (mode === "existing" ? "Add to group" : "Send invite")}
        </button>
      </div>
    </ModalShell>
  );
}

// ─── group modal ─────────────────────────────────────────────────────
function GroupModal({
  group, catalog, onClose, onSave, onDelete,
}: {
  group: PortalGroupDto;
  catalog: Catalog;
  onClose: () => void;
  onSave: (input: { id?: string; name: string; description: string; permissions: string[]; memberIds: string[] }) => Promise<void>;
  onDelete?: () => void;
}) {
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description || "");
  const [permissions, setPermissions] = useState<string[]>(group.permissions);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const isNew = !group.id;

  function togglePerm(k: string) {
    setPermissions((prev) => prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]);
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
        // Existing membership is preserved server-side because we send the
        // full current list back — that way editing permissions here doesn't
        // accidentally wipe members added via the + / trash on the card.
        memberIds: (group.members || []).map((m) => m.id),
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

      <div style={{ marginTop: 22 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 6 }}>
          <div style={{ fontWeight: 600, fontSize: "1rem" }}>Permissions</div>
          <div style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>
            {permissions.length} of {catalog.permissions.length} enabled
          </div>
        </div>
        <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", margin: "0 0 14px" }}>
          Members of this group get every permission checked here. Superadmins bypass this list entirely.
        </p>
        <div style={{ display: "grid", gap: 10 }}>
          {catalog.groups.map((section) => {
            const allOn = section.keys.every((k) => permissions.includes(k));
            const someOn = section.keys.some((k) => permissions.includes(k)) && !allOn;
            const icon = SECTION_ICONS[section.label] || "fa-shield";
            return (
              <div
                key={section.label}
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: "12px 14px",
                  background: allOn ? "rgba(249,115,22,0.05)" : "transparent",
                  transition: "background 0.15s ease",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <i className={`fa-solid ${icon}`} style={{ color: allOn ? "#f97316" : "var(--text-muted)", fontSize: 14 }} />
                    <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>{section.label}</div>
                    <span style={{ ...pillStyle(allOn ? "gold" : "muted"), fontSize: "0.68rem" }}>
                      {section.keys.filter((k) => permissions.includes(k)).length}/{section.keys.length}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleGroupBulk(section.keys)}
                    style={{
                      background: "none", border: "none", cursor: "pointer",
                      color: allOn ? "#f97316" : "var(--text-muted)",
                      fontSize: "0.78rem", fontWeight: 600, padding: "2px 6px",
                    }}
                  >
                    {allOn ? "Uncheck all" : someOn ? "Check remaining" : "Check all"}
                  </button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 4 }}>
                  {section.keys.map((k) => {
                    const meta = PERMISSION_LABELS[k];
                    const on = permissions.includes(k);
                    return (
                      <label
                        key={k}
                        style={{
                          display: "flex", alignItems: "flex-start", gap: 10,
                          padding: "8px 10px", borderRadius: 6,
                          background: on ? "rgba(249,115,22,0.08)" : "transparent",
                          cursor: "pointer",
                          border: `1px solid ${on ? "rgba(249,115,22,0.25)" : "transparent"}`,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() => togglePerm(k)}
                          style={{ marginTop: 2, accentColor: "#f97316" }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: "0.87rem", fontWeight: 500 }}>{meta?.label || k}</div>
                          {meta?.hint && (
                            <div style={{ color: "var(--text-muted)", fontSize: "0.72rem", marginTop: 2 }}>{meta.hint}</div>
                          )}
                          <code style={{ display: "block", color: "var(--text-muted)", fontSize: "0.68rem", marginTop: 2, opacity: 0.6 }}>{k}</code>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
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
