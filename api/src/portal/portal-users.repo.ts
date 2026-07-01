import { Injectable, Logger } from "@nestjs/common";
import { SupabaseService } from "../supabase/supabase.service";

export interface PortalUserRow {
  id: string;
  email: string;
  password_hash: string | null;
  name: string | null;
  status: "invited" | "active" | "disabled";
  is_superadmin: boolean;
  invite_token: string | null;
  invite_sent_at: string | null;
  invite_accepted_at: string | null;
  invited_by: string | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Public-safe projection — strips password + invite token before returning to clients. */
export interface PortalUserPublic {
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
}

export function toPortalUserPublic(u: PortalUserRow, groups?: Array<{ id: string; name: string }>): PortalUserPublic {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    status: u.status,
    is_superadmin: u.is_superadmin,
    invite_sent_at: u.invite_sent_at,
    invite_accepted_at: u.invite_accepted_at,
    last_login_at: u.last_login_at,
    created_at: u.created_at,
    groups,
  };
}

@Injectable()
export class PortalUsersRepo {
  private readonly logger = new Logger(PortalUsersRepo.name);
  constructor(private readonly supabase: SupabaseService) {}

  private table() { return this.supabase.admin().from("portal_users"); }

  async findByEmail(email: string): Promise<PortalUserRow | null> {
    const { data, error } = await this.table().select("*").eq("email", email.trim().toLowerCase()).maybeSingle();
    if (error) { this.logger.error(`findByEmail(${email}) failed: ${error.message}`); return null; }
    return (data as PortalUserRow | null) ?? null;
  }

  async findById(id: string): Promise<PortalUserRow | null> {
    const { data, error } = await this.table().select("*").eq("id", id).maybeSingle();
    if (error) { this.logger.error(`findById(${id}) failed: ${error.message}`); return null; }
    return (data as PortalUserRow | null) ?? null;
  }

  async findByInviteToken(token: string): Promise<PortalUserRow | null> {
    const { data, error } = await this.table().select("*").eq("invite_token", token).maybeSingle();
    if (error) { this.logger.error(`findByInviteToken failed: ${error.message}`); return null; }
    return (data as PortalUserRow | null) ?? null;
  }

  async list(params?: { search?: string; limit?: number; offset?: number }): Promise<PortalUserRow[]> {
    const limit = Math.min(params?.limit ?? 200, 500);
    const offset = Math.max(params?.offset ?? 0, 0);
    let q = this.table().select("*").order("created_at", { ascending: false }).range(offset, offset + limit - 1);
    if (params?.search) {
      const term = params.search.trim().toLowerCase();
      q = q.or(`email.ilike.%${term}%,name.ilike.%${term}%`);
    }
    const { data, error } = await q;
    if (error) { this.logger.error(`list portal_users failed: ${error.message}`); return []; }
    return (data as PortalUserRow[]) || [];
  }

  /** Insert a fresh row in 'invited' state; caller supplies invite token. */
  async createInvite(input: {
    email: string;
    name: string | null;
    inviteToken: string;
    invitedBy: string | null;
  }): Promise<PortalUserRow | null> {
    const { data, error } = await this.table()
      .insert({
        email: input.email.trim().toLowerCase(),
        name: input.name,
        status: "invited",
        invite_token: input.inviteToken,
        invite_sent_at: new Date().toISOString(),
        invited_by: input.invitedBy,
        password_hash: null,
      })
      .select("*")
      .single();
    if (error) { this.logger.error(`createInvite(${input.email}) failed: ${error.message}`); return null; }
    return data as PortalUserRow;
  }

  /** Rotate the invite token + timestamp (used by resend-invite). */
  async rotateInviteToken(id: string, newToken: string): Promise<PortalUserRow | null> {
    const { data, error } = await this.table()
      .update({ invite_token: newToken, invite_sent_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single();
    if (error) { this.logger.error(`rotateInviteToken(${id}) failed: ${error.message}`); return null; }
    return data as PortalUserRow;
  }

  /** Called when the user hits /admin/accept-invite with a valid token + new password. */
  async completeInvite(id: string, passwordHash: string, name: string | null): Promise<PortalUserRow | null> {
    const { data, error } = await this.table()
      .update({
        password_hash: passwordHash,
        name,
        status: "active",
        invite_token: null,
        invite_accepted_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();
    if (error) { this.logger.error(`completeInvite(${id}) failed: ${error.message}`); return null; }
    return data as PortalUserRow;
  }

  async touchLastLogin(id: string): Promise<void> {
    await this.table().update({ last_login_at: new Date().toISOString() }).eq("id", id);
  }

  async setStatus(id: string, status: "active" | "disabled"): Promise<PortalUserRow | null> {
    const { data, error } = await this.table().update({ status }).eq("id", id).select("*").single();
    if (error) { this.logger.error(`setStatus(${id}, ${status}) failed: ${error.message}`); return null; }
    return data as PortalUserRow;
  }

  async patch(id: string, patch: { name?: string | null; status?: "active" | "disabled"; is_superadmin?: boolean }): Promise<PortalUserRow | null> {
    const upd: Record<string, unknown> = {};
    if (patch.name !== undefined) upd.name = patch.name;
    if (patch.status !== undefined) upd.status = patch.status;
    if (patch.is_superadmin !== undefined) upd.is_superadmin = patch.is_superadmin;
    if (Object.keys(upd).length === 0) return this.findById(id);
    const { data, error } = await this.table().update(upd).eq("id", id).select("*").single();
    if (error) { this.logger.error(`patch(${id}) failed: ${error.message}`); return null; }
    return data as PortalUserRow;
  }

  async remove(id: string): Promise<boolean> {
    const { error } = await this.table().delete().eq("id", id);
    if (error) { this.logger.error(`remove(${id}) failed: ${error.message}`); return false; }
    return true;
  }

  /** Fetch group memberships for many users in one query (used by the list endpoint). */
  async membershipsForUsers(userIds: string[]): Promise<Map<string, Array<{ id: string; name: string }>>> {
    const map = new Map<string, Array<{ id: string; name: string }>>();
    if (userIds.length === 0) return map;
    const { data, error } = await this.supabase
      .admin()
      .from("portal_group_members")
      .select("user_id, portal_groups(id, name)")
      .in("user_id", userIds);
    if (error) { this.logger.error(`membershipsForUsers failed: ${error.message}`); return map; }
    type MembJoin = { user_id: string; portal_groups: { id: string; name: string } | Array<{ id: string; name: string }> | null };
    for (const row of ((data || []) as unknown) as MembJoin[]) {
      const group = Array.isArray(row.portal_groups) ? row.portal_groups[0] : row.portal_groups;
      if (!group) continue;
      const list = map.get(row.user_id) || [];
      list.push({ id: group.id, name: group.name });
      map.set(row.user_id, list);
    }
    return map;
  }
}
