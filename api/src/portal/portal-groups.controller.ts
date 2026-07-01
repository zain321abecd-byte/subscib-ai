import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import { PortalGroupsRepo, sanitizePermissions, type PortalGroupPublic } from "./portal-groups.repo";
import { RequirePortalPermission, RequireSuperadmin } from "./portal.guard";
import { PORTAL_PERMISSION_GROUPS, PORTAL_PERMISSION_KEYS } from "./portal-permissions";

function publicShape(row: { id: string; name: string; description: string | null; permissions: unknown; is_system: boolean; }, members?: Array<{ id: string; email: string; name: string | null; status: string }>): PortalGroupPublic {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    permissions: sanitizePermissions(row.permissions),
    is_system: row.is_system,
    member_count: members?.length ?? 0,
    members,
  };
}

@Controller("admin/portal-groups")
export class PortalGroupsController {
  constructor(private readonly groups: PortalGroupsRepo) {}

  /** GET /admin/portal-groups/catalog — permission keys + grouping labels for the UI. */
  @Get("catalog")
  @RequirePortalPermission("users:read")
  catalog() {
    return {
      permissions: PORTAL_PERMISSION_KEYS,
      groups: PORTAL_PERMISSION_GROUPS,
    };
  }

  /** GET /admin/portal-groups — list every group with its member list. */
  @Get()
  @RequirePortalPermission("users:read")
  async list() {
    const rows = await this.groups.list();
    const members = await this.groups.membersForGroups(rows.map((r) => r.id));
    return { groups: rows.map((r) => publicShape(r, members.get(r.id))) };
  }

  /** GET /admin/portal-groups/:id */
  @Get(":id")
  @RequirePortalPermission("users:read")
  async get(@Param("id") id: string) {
    const row = await this.groups.findById(id);
    if (!row) throw new NotFoundException("Group not found.");
    const members = (await this.groups.membersForGroups([id])).get(id);
    return { group: publicShape(row, members) };
  }

  /** POST /admin/portal-groups — create a custom group. */
  @Post()
  @RequirePortalPermission("users:write")
  async create(@Body() body: { name?: string; description?: string; permissions?: unknown[] }) {
    const name = (body?.name || "").trim();
    if (!name) throw new BadRequestException("Group name is required.");
    if (name.length > 60) throw new BadRequestException("Group name must be 60 characters or fewer.");
    const existing = await this.groups.findByName(name);
    if (existing) throw new ConflictException(`A group named "${name}" already exists.`);
    const permissions = sanitizePermissions(body?.permissions ?? []);
    const created = await this.groups.create({ name, description: body?.description ?? null, permissions });
    if (!created) throw new BadRequestException("Could not create group.");
    return { group: publicShape(created) };
  }

  /** PATCH /admin/portal-groups/:id — edit name/description/permissions. Membership is set via /members below. */
  @Patch(":id")
  @RequirePortalPermission("users:write")
  async update(
    @Param("id") id: string,
    @Body() body: { name?: string; description?: string | null; permissions?: unknown[] },
  ) {
    const existing = await this.groups.findById(id);
    if (!existing) throw new NotFoundException("Group not found.");
    // Renaming or deleting permissions on the seeded groups is allowed
    // (superadmin might want to tighten Managers, for example) — only
    // deletion of the row itself is blocked.
    const patch: { name?: string; description?: string | null; permissions?: ReturnType<typeof sanitizePermissions> } = {};
    if (body.name !== undefined) {
      const nextName = body.name.trim();
      if (!nextName) throw new BadRequestException("Group name cannot be empty.");
      if (nextName !== existing.name) {
        const clash = await this.groups.findByName(nextName);
        if (clash) throw new ConflictException(`A group named "${nextName}" already exists.`);
      }
      patch.name = nextName;
    }
    if (body.description !== undefined) patch.description = body.description;
    if (body.permissions !== undefined) patch.permissions = sanitizePermissions(body.permissions);
    const updated = await this.groups.update(id, patch);
    if (!updated) throw new BadRequestException("Update failed.");
    return { group: publicShape(updated) };
  }

  /** DELETE /admin/portal-groups/:id — superadmin only, system groups protected. */
  @Delete(":id")
  @RequireSuperadmin()
  async remove(@Param("id") id: string) {
    const existing = await this.groups.findById(id);
    if (!existing) throw new NotFoundException("Group not found.");
    if (existing.is_system) throw new ForbiddenException("Built-in groups can't be deleted. Empty its members instead.");
    const ok = await this.groups.remove(id);
    if (!ok) throw new BadRequestException("Delete failed.");
    return { ok: true };
  }

  // ── membership ────────────────────────────────────────────────────────
  /** PUT /admin/portal-groups/:id/members — replace the full set of user_ids in the group. */
  @Post(":id/members")
  @RequirePortalPermission("users:write")
  async setMembers(@Param("id") id: string, @Body() body: { user_ids?: string[] }) {
    const existing = await this.groups.findById(id);
    if (!existing) throw new NotFoundException("Group not found.");
    const ids = Array.isArray(body?.user_ids) ? body.user_ids.filter((v) => typeof v === "string") : [];
    await this.groups.setMembership(id, ids);
    return { ok: true };
  }

  /** POST /admin/portal-groups/:id/members/:userId — add one member. */
  @Post(":id/members/:userId")
  @RequirePortalPermission("users:write")
  async addMember(@Param("id") id: string, @Param("userId") userId: string) {
    const ok = await this.groups.addMember(id, userId);
    return { ok };
  }

  /** DELETE /admin/portal-groups/:id/members/:userId */
  @Delete(":id/members/:userId")
  @RequirePortalPermission("users:write")
  async removeMember(@Param("id") id: string, @Param("userId") userId: string) {
    const ok = await this.groups.removeMember(id, userId);
    return { ok };
  }
}
