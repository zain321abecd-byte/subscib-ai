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
  // Pending destructive-action confirmations get funnelled through a shared
  // styled modal instead of the browser's confirm() dialog. Each entry
  // holds a title + message + on-confirm callback.
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: React.ReactNode;
    confirmLabel?: string;
    danger?: boolean;
    onConfirm: () => Promise<void> | void;
  } | null>(null);

  // Superadmins sit above the group system — their access doesn't come
  // from any group membership, so listing them under "Admins" would be
  // misleading. Surface them as their own card at the top instead.
  const superadmins = useMemo(() => users.filter((u) => u.is_superadmin), [users]);

  // Regular (non-superadmin) users that aren't in any group. Freshly
  // invited teammates end up here until an admin puts them in one.
  const ungrouped = useMemo(
    () => users.filter((u) => !u.is_superadmin && (!u.groups || u.groups.length === 0)),
    [users],
  );

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
  function removeFromGroup(groupId: string, groupName: string, user: PortalUserDto) {
    setConfirmDialog({
      title: `Remove from ${groupName}?`,
      message: (
        <>
          <strong>{user.name || user.email}</strong> will lose the permissions this group grants.
          Their account stays active — you can re-add them any time.
        </>
      ),
      confirmLabel: "Remove from group",
      danger: true,
      onConfirm: async () => {
        try {
          await api("DELETE", `/admin/portal-groups/${groupId}/members/${user.id}`);
          notify("ok", "Removed from group.");
          await refreshAll();
        } catch (err: any) { notify("err", err.message); }
      },
    });
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

  function deleteGroup(g: PortalGroupDto) {
    if (g.is_system) { notify("err", "Built-in groups can't be deleted."); return; }
    const memberCount = (g.members || []).length;
    setConfirmDialog({
      title: `Delete group "${g.name}"?`,
      message: (
        <>
          The group will be removed{memberCount > 0 && <> and its <strong>{memberCount}</strong> member{memberCount === 1 ? "" : "s"} will lose the permissions it granted</>}.
          Their accounts stay active.
        </>
      ),
      confirmLabel: "Delete group",
      danger: true,
      onConfirm: async () => {
        try {
          await api("DELETE", `/admin/portal-groups/${g.id}`);
          notify("ok", "Group deleted.");
          setEditingGroup(null);
          await refreshAll();
        } catch (err: any) { notify("err", err.message); }
      },
    });
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

      {superadmins.length > 0 && (
        <SuperadminCard
          users={superadmins}
          onClickUser={(u) => setEditingUser(u)}
        />
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
            onRemoveMember={(u) => removeFromGroup(g.id, g.name, u)}
          />
        ))}
        {ungrouped.length > 0 && (
          <section
            style={{
              background: "var(--surface)", borderRadius: 10,
              border: "1px dashed rgba(245,158,11,0.4)", overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 14px",
                background: "rgba(245,158,11,0.06)",
                borderBottom: "1px solid rgba(245,158,11,0.2)",
              }}
            >
              <i className="fa-solid fa-triangle-exclamation" style={{ color: "#f59e0b", fontSize: 13 }} />
              <div style={{ fontWeight: 700, letterSpacing: "0.06em", fontSize: "0.82rem", textTransform: "uppercase", color: "#f59e0b" }}>
                Not in any group
              </div>
              <div style={{ flex: 1 }} />
              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                Can log in but see nothing until added
              </span>
            </div>
            <MemberList
              users={ungrouped}
              onClick={(u) => setEditingUser(u)}
              onRemove={undefined}
            />
          </section>
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
          onDelete={(u) => {
            setConfirmDialog({
              title: `Delete ${u.email}?`,
              message: (
                <>
                  This deletes the account and revokes portal access.
                  <strong> This can't be undone.</strong>
                </>
              ),
              confirmLabel: "Delete account",
              danger: true,
              onConfirm: async () => {
                try {
                  await api("DELETE", `/admin/portal-users/${u.id}`);
                  notify("ok", `${u.email} deleted.`);
                  setEditingUser(null);
                  await refreshAll();
                } catch (err: any) { notify("err", err.message); }
              },
            });
          }}
        />
      )}
      {confirmDialog && (
        <ConfirmModal
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmLabel={confirmDialog.confirmLabel}
          danger={confirmDialog.danger}
          onCancel={() => setConfirmDialog(null)}
          onConfirm={async () => {
            const d = confirmDialog;
            setConfirmDialog(null);
            await d.onConfirm();
          }}
        />
      )}
    </div>
  );
}

// ─── superadmin card ─────────────────────────────────────────────────
/**
 * Hero card at the top of the team page. Superadmins bypass every
 * permission check, so they don't belong inside any group — this card
 * makes their existence explicit (and gives the page a nice visual
 * anchor). Clicking a user opens the same drawer as any group member.
 */
function SuperadminCard({
  users, onClickUser,
}: { users: PortalUserDto[]; onClickUser: (u: PortalUserDto) => void }) {
  return (
    <section
      style={{
        position: "relative",
        borderRadius: 14,
        marginBottom: 18,
        overflow: "hidden",
        border: "1px solid rgba(249,115,22,0.35)",
        background:
          "linear-gradient(135deg, rgba(249,115,22,0.16) 0%, rgba(251,146,60,0.06) 50%, rgba(255,255,255,0.02) 100%)",
        boxShadow: "0 4px 20px rgba(249,115,22,0.08)",
      }}
    >
      {/* Subtle sheen in the top-right corner. */}
      <div
        aria-hidden
        style={{
          position: "absolute", top: -40, right: -40,
          width: 180, height: 180, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(249,115,22,0.25), transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <div style={{ padding: "18px 22px", display: "flex", alignItems: "center", gap: 14, position: "relative" }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          display: "grid", placeItems: "center",
          background: "linear-gradient(135deg, #f97316, #fb923c)",
          color: "#fff", fontSize: 18, flexShrink: 0,
          boxShadow: "0 6px 16px rgba(249,115,22,0.35)",
        }}>
          <i className="fa-solid fa-crown" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: "0.7rem", letterSpacing: "0.1em", fontWeight: 700,
            color: "#f97316", textTransform: "uppercase", marginBottom: 2,
          }}>
            Superadmin{users.length > 1 ? "s" : ""}
          </div>
          <div style={{ fontSize: "0.95rem", fontWeight: 600 }}>
            Full access, bypasses every permission check
          </div>
          <div style={{ color: "var(--text-muted)", fontSize: "0.78rem", marginTop: 2 }}>
            {users.length} account{users.length === 1 ? "" : "s"} · Can invite, remove, or promote any teammate
          </div>
        </div>
      </div>

      {/* List of superadmin accounts. */}
      <div style={{ borderTop: "1px solid rgba(249,115,22,0.2)" }}>
        {users.map((u, i) => (
          <div
            key={u.id}
            onClick={() => onClickUser(u)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter") onClickUser(u); }}
            style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "12px 22px",
              borderTop: i === 0 ? "none" : "1px solid rgba(249,115,22,0.12)",
              cursor: "pointer",
              transition: "background 0.12s ease",
            }}
          >
            <i className="fa-solid fa-user-shield" style={{ color: "#f97316", fontSize: 12, width: 14 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 500 }}>{u.name || u.email.split("@")[0]}</div>
              <div style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>{u.email}</div>
            </div>
            {u.status === "invited" && <span style={pillStyle("warn")}>INVITE NOT ACCEPTED</span>}
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── empty state ─────────────────────────────────────────────────────
/**
 * Placeholder shown inside a group card when there are no members.
 * A little more visual than plain italic gray text — it draws the eye
 * toward the "+" button that fixes it.
 */
function EmptyGroupPlaceholder({ groupName }: { groupName: string }) {
  return (
    <div
      style={{
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: "26px 18px", gap: 8, textAlign: "center",
        color: "var(--text-muted)",
      }}
    >
      <div
        aria-hidden
        style={{
          width: 40, height: 40, borderRadius: "50%",
          background: "var(--surface-2, rgba(255,255,255,0.04))",
          display: "grid", placeItems: "center",
          border: "1px dashed var(--border)",
        }}
      >
        <i className="fa-solid fa-user-plus" style={{ fontSize: 14 }} />
      </div>
      <div style={{ fontSize: "0.88rem", fontWeight: 500, color: "var(--text)" }}>
        No teammates in {groupName} yet
      </div>
      <div style={{ fontSize: "0.78rem" }}>
        Use the <strong style={{ color: "#f97316" }}>+</strong> button above to invite someone.
      </div>
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
  // Superadmins are surfaced in the dedicated top card, never inside a
  // group (their access doesn't come from group membership anyway).
  const memberFull: PortalUserDto[] = members
    .map((m) => allUsers.find((u) => u.id === m.id))
    .filter((u): u is PortalUserDto => !!u && !u.is_superadmin);

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
        <EmptyGroupPlaceholder groupName={group.name} />
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
 * Compact per-group invite modal. Both paths live on one page:
 *   • "Existing teammate" — a styled dropdown of portal users not yet
 *     in this group (adds them without emailing).
 *   • "New email" — invite by email address (with optional name).
 * The submit button picks the right action based on which field
 * the user filled in.
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
  const [pickedExisting, setPickedExisting] = useState<string>("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const alreadyIn = new Set((group.members || []).map((m) => m.id));
  // Superadmins don't need group membership — their access is universal —
  // so hide them from the picker to avoid a confusing "add superadmin to
  // Editors" option that would have no functional effect.
  const eligibleExisting = existingUsers.filter((u) => !u.is_superadmin && !alreadyIn.has(u.id));

  // Whichever field was touched last wins on submit — makes the "one form,
  // two intents" pattern feel natural.
  const mode: "existing" | "new" = pickedExisting ? "existing" : "new";

  async function submit() {
    setErr(null);
    setBusy(true);
    try {
      if (pickedExisting) {
        await onAddExisting(pickedExisting);
      } else if (email.trim()) {
        await onSubmit({ email: email.trim(), name: name.trim() });
      } else {
        setErr("Pick an existing teammate or enter an email address.");
      }
    } finally { setBusy(false); }
  }

  return (
    <ModalShell
      onClose={onClose}
      title={`Invite teammate to ${group.name}`}
      size="sm"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            style={{
              background: "none", border: "none",
              fontSize: "0.82rem", letterSpacing: "0.08em", fontWeight: 700,
              color: "var(--text-muted)", cursor: "pointer",
              padding: "10px 16px",
            }}
          >
            CANCEL
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy || (!pickedExisting && !email.trim())}
            style={{
              background: "#f97316", color: "#fff",
              border: "none", borderRadius: 6,
              fontSize: "0.82rem", letterSpacing: "0.08em", fontWeight: 700,
              padding: "10px 18px",
              cursor: "pointer",
              opacity: (!pickedExisting && !email.trim()) || busy ? 0.55 : 1,
            }}
          >
            {busy
              ? (mode === "existing" ? "ADDING…" : "SENDING…")
              : (mode === "existing" ? "ADD TO GROUP" : "SEND INVITE")}
          </button>
        </>
      }
    >
      <p style={{ color: "var(--text-muted)", margin: "0 0 18px", fontSize: "0.85rem" }}>
        They'll get {group.permissions.length} permission{group.permissions.length === 1 ? "" : "s"} as soon as they accept.
      </p>

      <div style={{ display: "grid", gap: 6, marginBottom: 16 }}>
        <label style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontWeight: 500 }}>
          Choose existing teammate
        </label>
        <StyledSelect
          value={pickedExisting}
          onChange={(v) => { setPickedExisting(v); if (v) { setEmail(""); setName(""); } }}
          placeholder={
            eligibleExisting.length === 0
              ? "Everyone is already in this group"
              : `Search ${eligibleExisting.length} teammate${eligibleExisting.length === 1 ? "" : "s"}…`
          }
          disabled={eligibleExisting.length === 0}
          options={eligibleExisting.map((u) => ({
            value: u.id,
            label: u.name ? `${u.name}` : u.email.split("@")[0],
            hint: u.email + (u.status === "invited" ? " · pending" : ""),
          }))}
        />
      </div>

      <div style={{
        display: "flex", alignItems: "center", gap: 10, margin: "18px 0",
        color: "var(--text-muted)", fontSize: "0.75rem", letterSpacing: "0.08em", fontWeight: 600,
      }}>
        <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
        OR INVITE BY EMAIL
        <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        <input
          className="admin-input"
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); if (e.target.value) setPickedExisting(""); }}
          placeholder="alex@subscribai.com"
          disabled={!!pickedExisting}
        />
        <input
          className="admin-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name (optional)"
          disabled={!!pickedExisting || !email}
        />
      </div>

      {err && <div style={{ color: "#ef4444", fontSize: "0.85rem", marginTop: 14 }}>{err}</div>}
    </ModalShell>
  );
}

/**
 * Styled combobox with a custom dropdown panel (replaces the native
 * <select> which can't be themed inside the modal). Closes on outside
 * click and on selection; keyboard-friendly enough for the common case.
 */
function StyledSelect({
  value, onChange, placeholder, options, disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: Array<{ value: string; label: string; hint?: string }>;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        style={{
          width: "100%", textAlign: "left",
          padding: "12px 14px", borderRadius: 10,
          border: `1px solid ${open ? "rgba(249,115,22,0.5)" : "var(--border)"}`,
          background: "var(--surface-2, rgba(255,255,255,0.03))",
          color: disabled ? "var(--text-muted)" : "var(--text)",
          fontSize: "0.9rem",
          display: "flex", alignItems: "center", gap: 12,
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.55 : 1,
          boxShadow: open ? "0 0 0 3px rgba(249,115,22,0.15)" : "none",
          transition: "border-color 0.15s, box-shadow 0.15s",
        }}
      >
        {/* Left-side icon — an "at" symbol when placeholder is showing, a checkmark when a value is picked. */}
        <span
          aria-hidden
          style={{
            width: 30, height: 30, borderRadius: 8,
            display: "grid", placeItems: "center", flexShrink: 0,
            background: selected ? "rgba(249,115,22,0.15)" : "var(--surface-2, rgba(255,255,255,0.05))",
            color: selected ? "#f97316" : "var(--text-muted)",
          }}
        >
          <i className={`fa-solid ${selected ? "fa-user-check" : "fa-magnifying-glass"}`} style={{ fontSize: 12 }} />
        </span>
        <span style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
          {selected ? (
            <>
              <div style={{ fontWeight: 600, fontSize: "0.92rem" }}>{selected.label}</div>
              {selected.hint && (
                <div style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginTop: 1 }}>{selected.hint}</div>
              )}
            </>
          ) : (
            <span style={{ color: "var(--text-muted)", opacity: 0.75, fontSize: "0.9rem" }}>
              {placeholder}
            </span>
          )}
        </span>
        <i className={`fa-solid ${open ? "fa-chevron-up" : "fa-chevron-down"}`} style={{ fontSize: 11, color: "var(--text-muted)", flexShrink: 0 }} />
      </button>
      {open && !disabled && (
        <>
          {/* Click-away overlay */}
          <div
            onClick={() => setOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: 1 }}
          />
          <div
            style={{
              position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: 8, zIndex: 2, maxHeight: 240, overflowY: "auto",
              boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            }}
          >
            {options.length === 0 && (
              <div style={{ padding: "12px 14px", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                No teammates available
              </div>
            )}
            {options.map((o) => {
              const active = o.value === value;
              return (
                <div
                  key={o.value}
                  onClick={() => { onChange(o.value); setOpen(false); }}
                  style={{
                    padding: "10px 14px", cursor: "pointer",
                    display: "flex", flexDirection: "column", gap: 2,
                    background: active ? "rgba(249,115,22,0.08)" : "transparent",
                    borderLeft: `3px solid ${active ? "#f97316" : "transparent"}`,
                  }}
                >
                  <span style={{ fontSize: "0.9rem", fontWeight: active ? 600 : 500, color: active ? "#f97316" : "var(--text)" }}>{o.label}</span>
                  {o.hint && <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{o.hint}</span>}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
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

  // Which section tab is active on the left. Defaults to the first
  // section in the catalog (usually Products).
  const [activeSection, setActiveSection] = useState<string>(catalog.groups[0]?.label ?? "");

  // Nothing has changed unless the state differs from the initial group prop.
  const dirty =
    name.trim() !== group.name ||
    (description.trim() !== (group.description || "")) ||
    permissions.length !== group.permissions.length ||
    permissions.some((p) => !group.permissions.includes(p));

  const activeSectionDef = catalog.groups.find((s) => s.label === activeSection) || catalog.groups[0];
  const title = isNew ? "New group" : `Manage permissions for ${group.name}`;

  return (
    <ModalShell
      onClose={onClose}
      title={title}
      size="lg"
      footer={
        <>
          <div>
            {onDelete && (
              <button
                className="admin-btn admin-btn-ghost"
                style={{ color: "#ef4444" }}
                onClick={onDelete}
                disabled={busy}
              >
                <i className="fa-solid fa-trash" /> Delete group
              </button>
            )}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              style={{
                background: "none", border: "none",
                fontSize: "0.82rem", letterSpacing: "0.08em", fontWeight: 700,
                color: "var(--text-muted)", cursor: "pointer",
                padding: "10px 16px",
              }}
            >
              CANCEL
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={busy || (!isNew && !dirty) || !name.trim()}
              style={{
                background: dirty || isNew ? "#f97316" : "var(--surface-2, rgba(255,255,255,0.06))",
                color: dirty || isNew ? "#fff" : "var(--text-muted)",
                border: "none", borderRadius: 6,
                fontSize: "0.82rem", letterSpacing: "0.08em", fontWeight: 700,
                padding: "10px 18px",
                cursor: dirty || isNew ? "pointer" : "not-allowed",
                opacity: busy ? 0.6 : 1,
              }}
            >
              {busy ? "SAVING…" : "SAVE CHANGES"}
            </button>
          </div>
        </>
      }
    >
      {/* Name + description (only visible when creating or explicitly renaming). */}
      {(isNew || !group.is_system) && (
        <div style={{ display: "grid", gap: 12, marginBottom: 22 }}>
          <label style={labelStyle}>Name
            <input
              className="admin-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={group.is_system}
              autoFocus={isNew}
            />
          </label>
          <label style={labelStyle}>Description
            <input
              className="admin-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional — helps teammates understand who this is for."
            />
          </label>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>Permissions</div>
        <div style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>
          {permissions.length} of {catalog.permissions.length} enabled
        </div>
      </div>

      {/* Two-column layout: left tab list, right toggle rows. */}
      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 20, minHeight: 380 }}>
        {/* LEFT — section tabs */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, borderRight: "1px solid var(--border)", paddingRight: 20 }}>
          {catalog.groups.map((section) => {
            const active = activeSection === section.label;
            const count = section.keys.filter((k) => permissions.includes(k)).length;
            const icon = SECTION_ICONS[section.label] || "fa-shield";
            return (
              <button
                key={section.label}
                type="button"
                onClick={() => setActiveSection(section.label)}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 12px", borderRadius: 8, cursor: "pointer",
                  background: active ? "rgba(249,115,22,0.08)" : "transparent",
                  border: `1px solid ${active ? "rgba(249,115,22,0.35)" : "var(--border)"}`,
                  color: active ? "#f97316" : "var(--text)",
                  fontSize: "0.9rem", fontWeight: active ? 600 : 500,
                  textAlign: "left", transition: "all 0.12s ease",
                }}
              >
                <i className={`fa-solid ${icon}`} style={{ fontSize: 13, width: 16, textAlign: "center" }} />
                <span style={{ flex: 1 }}>{section.label}</span>
                {count > 0 && (
                  <span style={{
                    fontSize: "0.68rem", fontWeight: 700,
                    padding: "2px 7px", borderRadius: 999,
                    background: active ? "rgba(249,115,22,0.2)" : "var(--surface-2, rgba(255,255,255,0.06))",
                    color: active ? "#f97316" : "var(--text-muted)",
                  }}>
                    {count}/{section.keys.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* RIGHT — toggle rows for the active section */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {activeSectionDef?.keys.map((k) => {
            const meta = PERMISSION_LABELS[k];
            const on = permissions.includes(k);
            return (
              <div
                key={k}
                onClick={() => togglePerm(k)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); togglePerm(k); } }}
                style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "14px 18px", borderRadius: 10,
                  border: "1px solid var(--border)",
                  background: on ? "rgba(249,115,22,0.04)" : "transparent",
                  cursor: "pointer", transition: "background 0.12s ease",
                }}
              >
                <i
                  className={`fa-solid ${SECTION_ICONS[activeSectionDef.label] || "fa-shield"}`}
                  style={{ color: on ? "#f97316" : "var(--text-muted)", fontSize: 15, width: 20, textAlign: "center" }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, fontSize: "0.92rem" }}>{meta?.label || k}</div>
                  <div style={{ color: "var(--text-muted)", fontSize: "0.77rem", marginTop: 2 }}>
                    {meta?.hint || `Grants ${k}`}
                  </div>
                </div>
                <Toggle on={on} />
              </div>
            );
          })}
          {activeSectionDef && (
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
              <button
                type="button"
                onClick={() => toggleGroupBulk(activeSectionDef.keys)}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: "var(--text-muted)", fontSize: "0.78rem", fontWeight: 600,
                }}
              >
                {activeSectionDef.keys.every((k) => permissions.includes(k))
                  ? "Turn off all in this section"
                  : "Turn on all in this section"}
              </button>
            </div>
          )}
        </div>
      </div>

      {err && <div style={{ color: "#ef4444", fontSize: "0.85rem", marginTop: 16 }}>{err}</div>}
    </ModalShell>
  );
}

/** iOS-style toggle switch. Orange when on, muted when off. */
function Toggle({ on }: { on: boolean }) {
  return (
    <span
      aria-checked={on}
      role="switch"
      style={{
        display: "inline-block", position: "relative",
        width: 42, height: 24, borderRadius: 999,
        background: on ? "#f97316" : "var(--surface-2, rgba(255,255,255,0.15))",
        transition: "background 0.15s ease",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: "absolute", top: 2, left: on ? 20 : 2,
          width: 20, height: 20, borderRadius: "50%",
          background: "#fff",
          transition: "left 0.15s ease",
          boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
        }}
      />
    </span>
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
/**
 * Modal shell with an optional sticky footer. When `footer` is provided
 * the layout becomes header (fixed) / body (scrolls) / footer (fixed) —
 * useful for the permission editor where the actions must always be
 * visible while the permission list scrolls.
 *
 * `size` picks the max-width: "sm" for the compact invite modal,
 * "lg" for the wider permission editor.
 */
function ModalShell({
  title, children, onClose, footer, size = "md",
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const maxWidth = size === "sm" ? 480 : size === "lg" ? 960 : 720;
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
          maxWidth, width: "100%", maxHeight: "88vh",
          display: "flex", flexDirection: "column",
          boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
          overflow: "hidden",
        }}
      >
        {/* Sticky header */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "16px 22px", borderBottom: "1px solid var(--border)",
          flexShrink: 0,
        }}>
          <h2 style={{
            margin: 0, fontFamily: "var(--font-heading)",
            fontSize: "0.82rem", letterSpacing: "0.06em", textTransform: "uppercase",
            color: "var(--text-muted)", fontWeight: 700,
          }}>
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 18, cursor: "pointer" }}
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="admin-scroll" style={{ flex: 1, overflowY: "auto", padding: "22px 22px" }}>
          {children}
        </div>

        {/* Optional sticky footer */}
        {footer && (
          <div style={{
            padding: "12px 22px", borderTop: "1px solid var(--border)",
            display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12,
            flexShrink: 0, background: "var(--surface)",
          }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── confirmation modal ──────────────────────────────────────────────
/**
 * Small styled confirmation dialog — replacement for the browser's
 * confirm() prompt. Danger actions get a red confirm button; passing
 * `danger={false}` renders it in the brand orange for neutral flows.
 */
function ConfirmModal({
  title, message, confirmLabel = "Confirm", danger, onConfirm, onCancel,
}: {
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
}) {
  const [busy, setBusy] = useState(false);
  async function submit() {
    setBusy(true);
    try { await onConfirm(); }
    finally { setBusy(false); }
  }
  const confirmBg = danger ? "#ef4444" : "#f97316";
  return (
    <ModalShell
      onClose={busy ? () => {} : onCancel}
      title={title}
      size="sm"
      footer={
        <>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            style={{
              background: "none", border: "none",
              fontSize: "0.82rem", letterSpacing: "0.08em", fontWeight: 700,
              color: "var(--text-muted)", cursor: "pointer",
              padding: "10px 16px",
            }}
          >
            CANCEL
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy}
            style={{
              background: confirmBg, color: "#fff",
              border: "none", borderRadius: 6,
              fontSize: "0.82rem", letterSpacing: "0.08em", fontWeight: 700,
              padding: "10px 18px",
              cursor: "pointer",
              opacity: busy ? 0.6 : 1,
            }}
          >
            {busy ? "WORKING…" : confirmLabel.toUpperCase()}
          </button>
        </>
      }
    >
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
        <div
          aria-hidden
          style={{
            width: 40, height: 40, borderRadius: 10,
            display: "grid", placeItems: "center", flexShrink: 0,
            background: danger ? "rgba(239,68,68,0.12)" : "rgba(249,115,22,0.12)",
            color: danger ? "#ef4444" : "#f97316",
          }}
        >
          <i className={`fa-solid ${danger ? "fa-triangle-exclamation" : "fa-circle-info"}`} />
        </div>
        <div style={{ flex: 1, fontSize: "0.9rem", lineHeight: 1.5, color: "var(--text)" }}>
          {message}
        </div>
      </div>
    </ModalShell>
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
