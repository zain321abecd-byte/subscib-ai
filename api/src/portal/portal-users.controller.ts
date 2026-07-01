import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import { PortalInvitesService } from "./portal-invites.service";
import { PortalUsersRepo, toPortalUserPublic } from "./portal-users.repo";
import { RequirePortalPermission, RequireSuperadmin, type PortalRequest } from "./portal.guard";

@Controller("admin/portal-users")
export class PortalUsersController {
  constructor(
    private readonly users: PortalUsersRepo,
    private readonly invites: PortalInvitesService,
  ) {}

  /** GET /admin/portal-users — list teammates + which groups they belong to. */
  @Get()
  @RequirePortalPermission("users:read")
  async list(@Query("search") search?: string) {
    const rows = await this.users.list({ search });
    const memberships = await this.users.membershipsForUsers(rows.map((r) => r.id));
    return {
      users: rows.map((u) => toPortalUserPublic(u, memberships.get(u.id))),
    };
  }

  /**
   * POST /admin/portal-users — invite a new teammate.
   * Body: { email, name?, group_ids?: string[] }
   * Requires 'users:write'. Only superadmin can invite another superadmin
   * (that path goes through PATCH /:id below, not create).
   */
  @Post()
  @RequirePortalPermission("users:write")
  async invite(
    @Body() body: { email?: string; name?: string; group_ids?: string[] },
    @Req() req: PortalRequest,
  ) {
    if (!req.portalUser) throw new ForbiddenException();
    if (!body?.email) throw new BadRequestException("Email is required.");
    return this.invites.invite({
      email: body.email,
      name: body.name || null,
      groupIds: Array.isArray(body.group_ids) ? body.group_ids : [],
      invitedBy: { id: req.portalUser.id, name: req.portalUser.name },
    });
  }

  /** POST /admin/portal-users/:id/resend-invite */
  @Post(":id/resend-invite")
  @RequirePortalPermission("users:write")
  async resend(
    @Param("id") id: string,
    @Body() body: { group_ids?: string[] } | undefined,
    @Req() req: PortalRequest,
  ) {
    if (!req.portalUser) throw new ForbiddenException();
    const groups = body && Array.isArray(body.group_ids) ? body.group_ids : undefined;
    const user = await this.invites.resend(id, groups, {
      id: req.portalUser.id,
      name: req.portalUser.name,
    });
    return { user };
  }

  /** PATCH /admin/portal-users/:id — update name / status / superadmin flag. */
  @Patch(":id")
  @RequirePortalPermission("users:write")
  async patch(
    @Param("id") id: string,
    @Body() body: { name?: string | null; status?: "active" | "disabled"; is_superadmin?: boolean },
    @Req() req: PortalRequest,
  ) {
    if (!req.portalUser) throw new ForbiddenException();
    const target = await this.users.findById(id);
    if (!target) throw new NotFoundException("Portal user not found.");

    // Only superadmin can flip the is_superadmin bit.
    if (typeof body.is_superadmin === "boolean" && body.is_superadmin !== target.is_superadmin && !req.portalUser.is_superadmin) {
      throw new ForbiddenException("Only superadmin can change superadmin status.");
    }
    // Self-demotion lock — a superadmin can't unflag themselves via this endpoint.
    if (target.id === req.portalUser.id && body.is_superadmin === false) {
      throw new ForbiddenException("You cannot revoke your own superadmin status.");
    }
    // Self-disable lock.
    if (target.id === req.portalUser.id && body.status === "disabled") {
      throw new ForbiddenException("You cannot disable your own account.");
    }

    const patch: { name?: string | null; status?: "active" | "disabled"; is_superadmin?: boolean } = {};
    if (body.name !== undefined) patch.name = body.name;
    if (body.status !== undefined) patch.status = body.status;
    if (body.is_superadmin !== undefined && req.portalUser.is_superadmin) patch.is_superadmin = body.is_superadmin;

    const updated = await this.users.patch(id, patch);
    if (!updated) throw new BadRequestException("Update failed.");
    return { user: toPortalUserPublic(updated) };
  }

  /** DELETE /admin/portal-users/:id — hard delete, superadmin only. */
  @Delete(":id")
  @RequireSuperadmin()
  async remove(@Param("id") id: string, @Req() req: PortalRequest) {
    if (!req.portalUser) throw new ForbiddenException();
    if (id === req.portalUser.id) throw new ForbiddenException("You cannot delete your own account.");
    const ok = await this.users.remove(id);
    if (!ok) throw new NotFoundException("Portal user not found or delete failed.");
    return { ok: true };
  }
}
