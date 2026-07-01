import { Injectable, Logger } from "@nestjs/common";
import { SupabaseService } from "../supabase/supabase.service";
import { PORTAL_PERMISSION_KEYS, isPortalPermissionKey, type PortalPermissionKey } from "./portal-permissions";

export interface PortalGroupRow {
  id: string;
  name: string;
  description: string | null;
  permissions: unknown; // JSONB array; validate via sanitizePermissions()
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface PortalGroupPublic {
  id: string;
  name: string;
  description: string | null;
  permissions: PortalPermissionKey[];
  is_system: boolean;
  member_count?: number;
  members?: Array<{ id: string; email: string; name: string | null; status: string }>;
}

export function sanitizePermissions(raw: unknown): PortalPermissionKey[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: PortalPermissionKey[] = [];
  for (const k of raw) {
    if (typeof k !== "string" || seen.has(k)) continue;
    if (isPortalPermissionKey(k)) {
      seen.add(k);
      out.push(k);
    }
  }
  return out;
}

@Injectable()
export class PortalGroupsRepo {
  private readonly logger = new Logger(PortalGroupsRepo.name);
  constructor(private readonly supabase: SupabaseService) {}

  private table() { return this.supabase.admin().from("portal_groups"); }

  async list(): Promise<PortalGroupRow[]> {
    const { data, error } = await this.table().select("*").order("is_system", { ascending: false }).order("name");
    if (error) { this.logger.error(`list groups failed: ${error.message}`); return []; }
    return (data as PortalGroupRow[]) || [];
  }

  async findById(id: string): Promise<PortalGroupRow | null> {
    const { data, error } = await this.table().select("*").eq("id", id).maybeSingle();
    if (error) { this.logger.error(`findById(${id}) failed: ${error.message}`); return null; }
    return (data as PortalGroupRow | null) ?? null;
  }

  async findByName(name: string): Promise<PortalGroupRow | null> {
    const { data, error } = await this.table().select("*").eq("name", name).maybeSingle();
    if (error) { this.logger.error(`findByName(${name}) failed: ${error.message}`); return null; }
    return (data as PortalGroupRow | null) ?? null;
  }

  async create(input: { name: string; description?: string | null; permissions: PortalPermissionKey[] }): Promise<PortalGroupRow | null> {
    const { data, error } = await this.table()
      .insert({
        name: input.name.trim(),
        description: input.description ?? null,
        permissions: input.permissions,
        is_system: false,
      })
      .select("*")
      .single();
    if (error) { this.logger.error(`create group failed: ${error.message}`); return null; }
    return data as PortalGroupRow;
  }

  async update(id: string, patch: { name?: string; description?: string | null; permissions?: PortalPermissionKey[] }): Promise<PortalGroupRow | null> {
    const upd: Record<string, unknown> = {};
    if (patch.name !== undefined) upd.name = patch.name.trim();
    if (patch.description !== undefined) upd.description = patch.description;
    if (patch.permissions !== undefined) upd.permissions = patch.permissions;
    if (Object.keys(upd).length === 0) return this.findById(id);
    const { data, error } = await this.table().update(upd).eq("id", id).select("*").single();
    if (error) { this.logger.error(`update(${id}) failed: ${error.message}`); return null; }
    return data as PortalGroupRow;
  }

  async remove(id: string): Promise<boolean> {
    // System groups (Admins/Managers/Editors) can't be deleted.
    const existing = await this.findById(id);
    if (!existing) return false;
    if (existing.is_system) return false;
    const { error } = await this.table().delete().eq("id", id);
    if (error) { this.logger.error(`remove(${id}) failed: ${error.message}`); return false; }
    return true;
  }

  // ── membership ─────────────────────────────────────────────────────────
  async setMembership(groupId: string, userIds: string[]): Promise<void> {
    // Clear then re-insert. Simpler than diffing for a UI that just POSTs the desired set.
    await this.supabase.admin().from("portal_group_members").delete().eq("group_id", groupId);
    if (userIds.length === 0) return;
    const rows = userIds.map((user_id) => ({ group_id: groupId, user_id }));
    const { error } = await this.supabase.admin().from("portal_group_members").insert(rows);
    if (error) this.logger.error(`setMembership(${groupId}) failed: ${error.message}`);
  }

  async addMember(groupId: string, userId: string): Promise<boolean> {
    const { error } = await this.supabase
      .admin()
      .from("portal_group_members")
      .upsert({ group_id: groupId, user_id: userId }, { onConflict: "group_id,user_id" });
    if (error) { this.logger.error(`addMember(${groupId},${userId}) failed: ${error.message}`); return false; }
    return true;
  }

  async removeMember(groupId: string, userId: string): Promise<boolean> {
    const { error } = await this.supabase
      .admin()
      .from("portal_group_members")
      .delete()
      .eq("group_id", groupId)
      .eq("user_id", userId);
    if (error) { this.logger.error(`removeMember(${groupId},${userId}) failed: ${error.message}`); return false; }
    return true;
  }

  /** Fetch the members for many groups in one query. */
  async membersForGroups(groupIds: string[]): Promise<Map<string, Array<{ id: string; email: string; name: string | null; status: string }>>> {
    const out = new Map<string, Array<{ id: string; email: string; name: string | null; status: string }>>();
    if (groupIds.length === 0) return out;
    const { data, error } = await this.supabase
      .admin()
      .from("portal_group_members")
      .select("group_id, portal_users(id, email, name, status)")
      .in("group_id", groupIds);
    if (error) { this.logger.error(`membersForGroups failed: ${error.message}`); return out; }
    // Supabase types the joined side as an array even for a many-to-one — normalise either shape.
    type MemberJoin = { group_id: string; portal_users: { id: string; email: string; name: string | null; status: string } | Array<{ id: string; email: string; name: string | null; status: string }> | null };
    for (const row of ((data || []) as unknown) as MemberJoin[]) {
      const user = Array.isArray(row.portal_users) ? row.portal_users[0] : row.portal_users;
      if (!user) continue;
      const list = out.get(row.group_id) || [];
      list.push(user);
      out.set(row.group_id, list);
    }
    return out;
  }

  /** Union of every permission key across a user's group memberships. */
  async permissionsForUser(userId: string): Promise<Set<PortalPermissionKey>> {
    const { data, error } = await this.supabase
      .admin()
      .from("portal_group_members")
      .select("portal_groups(permissions)")
      .eq("user_id", userId);
    if (error) { this.logger.error(`permissionsForUser(${userId}) failed: ${error.message}`); return new Set(); }
    const set = new Set<PortalPermissionKey>();
    type PermJoin = { portal_groups: { permissions: unknown } | Array<{ permissions: unknown }> | null };
    for (const row of ((data || []) as unknown) as PermJoin[]) {
      const group = Array.isArray(row.portal_groups) ? row.portal_groups[0] : row.portal_groups;
      const perms = group?.permissions;
      if (!Array.isArray(perms)) continue;
      for (const k of perms) if (isPortalPermissionKey(k)) set.add(k);
    }
    return set;
  }
}

export { PORTAL_PERMISSION_KEYS };
