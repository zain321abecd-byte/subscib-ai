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
} from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import * as crypto from "node:crypto";
import { RequirePermission } from "../auth/permission.guard";
import { UsersRepo, type UserRow } from "../auth/users.repo";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthUser } from "../auth/auth.types";
import {
  PERMISSION_GROUPS,
  PERMISSION_KEYS,
  ROLE_DEFAULTS,
  ROLES,
  parseOverride,
  resolveEffectivePermissions,
  type PermissionKey,
  type Role,
} from "../auth/permissions";

function publicUser(u: UserRow) {
  const override = parseOverride(u.permissions);
  const effective = Array.from(resolveEffectivePermissions(u.role as Role, override));
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    phone: u.phone,
    role: u.role,
    override,
    effectivePermissions: effective,
    email_verified_at: u.email_verified_at,
    last_login_at: u.last_login_at,
    created_at: u.created_at,
  };
}

/**
 * Guards for sensitive role mutations:
 *   - Only superadmin can change roles ('users:assign-roles').
 *   - Only superadmin can delete users ('users:delete').
 *   - Nobody can demote/delete themselves (locks-out prevention).
 *   - Nobody can create or modify a 'superadmin' unless they are themselves
 *     'superadmin' (a regular admin shouldn't be able to elevate someone).
 */
@Controller("admin/users")
export class UsersAdminController {
  constructor(private readonly users: UsersRepo) {}

  /** GET /admin/users/catalog — what permission keys exist + role defaults. UI-friendly. */
  @Get("catalog")
  @RequirePermission("users:read")
  catalog() {
    return {
      roles: ROLES,
      permissions: PERMISSION_KEYS,
      groups: PERMISSION_GROUPS,
      roleDefaults: Object.fromEntries(ROLES.map((r) => [r, ROLE_DEFAULTS[r]])),
    };
  }

  /** GET /admin/users — list users. */
  @Get()
  @RequirePermission("users:read")
  async list(@Query("search") search?: string, @Query("limit") limit?: string, @Query("offset") offset?: string) {
    const rows = await this.users.list({
      search,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
    return { users: rows.map(publicUser) };
  }

  /** GET /admin/users/:id — single user with effective permissions resolved. */
  @Get(":id")
  @RequirePermission("users:read")
  async get(@Param("id") id: string) {
    const u = await this.users.findById(id);
    if (!u) throw new NotFoundException("User not found");
    return { user: publicUser(u) };
  }

  /** PATCH /admin/users/:id — update role + per-user permission override. */
  @Patch(":id")
  @RequirePermission("users:assign-roles")
  async update(
    @Param("id") id: string,
    @Body() body: { role?: Role; grant?: PermissionKey[]; revoke?: PermissionKey[] },
    @CurrentUser() actor: AuthUser,
  ) {
    const target = await this.users.findById(id);
    if (!target) throw new NotFoundException("User not found");

    // Self-demotion lock — superadmin cannot strip their own role.
    if (target.id === actor.id && body.role && body.role !== "superadmin") {
      throw new ForbiddenException("You cannot change your own role. Have another superadmin do it.");
    }
    // Privilege-escalation lock — only superadmin can grant superadmin.
    if (body.role === "superadmin" && actor.role !== "superadmin") {
      throw new ForbiddenException("Only superadmin can assign the superadmin role.");
    }

    const role = body.role && (ROLES as readonly string[]).includes(body.role)
      ? (body.role as Role)
      : (target.role as Role);

    // Sanitize grant/revoke against the known catalog.
    const known = new Set<string>(PERMISSION_KEYS);
    const grant = (body.grant || []).filter((k): k is PermissionKey => known.has(k));
    const revoke = (body.revoke || []).filter((k): k is PermissionKey => known.has(k));
    const override = grant.length || revoke.length ? { grant: grant.length ? grant : undefined, revoke: revoke.length ? revoke : undefined } : {};

    const updated = await this.users.updateRoleAndPermissions(id, role, override);
    if (!updated) throw new BadRequestException("Could not update user.");
    return { ok: true, user: publicUser(updated) };
  }

  /** POST /admin/users — create a teammate account. Sends them a verification email is OUT OF SCOPE here;
   *  for now we pre-verify and require them to use "forgot password" if they want to set their own. */
  @Post()
  @RequirePermission("users:write")
  async create(
    @Body() body: { email?: string; name?: string; role?: Role; tempPassword?: string },
    @CurrentUser() actor: AuthUser,
  ) {
    const email = (body.email || "").trim().toLowerCase();
    const name = (body.name || "").trim() || null;
    const role: Role = body.role && (ROLES as readonly string[]).includes(body.role) ? (body.role as Role) : "editor";
    const tempPassword = (body.tempPassword || "").trim();

    if (!email) throw new BadRequestException("Email is required.");
    if (tempPassword.length < 8) throw new BadRequestException("Temporary password must be at least 8 characters.");
    if (role === "superadmin" && actor.role !== "superadmin") {
      throw new ForbiddenException("Only superadmin can create superadmin accounts.");
    }

    const existing = await this.users.findByEmail(email);
    if (existing) throw new BadRequestException("A user with that email already exists.");

    const passwordHash = await bcrypt.hash(tempPassword, 12);
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const row = await this.users.create({ email, passwordHash, name, verificationToken });
    if (!row) throw new BadRequestException("Could not create user.");

    // Promote the freshly-created row to the requested role + auto-verify.
    const promoted = await this.users.updateRoleAndPermissions(row.id, role, {});
    if (promoted) {
      // Mark verified so they can log in immediately with the temp password.
      await this.users.markVerified(promoted.id);
    }

    const fresh = await this.users.findById(row.id);
    return { ok: true, user: fresh ? publicUser(fresh) : publicUser(row) };
  }

  @Delete(":id")
  @RequirePermission("users:delete")
  async remove(@Param("id") id: string, @CurrentUser() actor: AuthUser) {
    if (id === actor.id) throw new ForbiddenException("You cannot delete your own account.");
    const target = await this.users.findById(id);
    if (!target) throw new NotFoundException("User not found");
    if (target.role === "superadmin" && actor.role !== "superadmin") {
      throw new ForbiddenException("Only superadmin can delete a superadmin.");
    }
    const ok = await this.users.deleteUser(id);
    return { ok };
  }
}
