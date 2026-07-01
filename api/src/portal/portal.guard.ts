import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
  UseGuards,
  applyDecorators,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { PortalAuthService } from "./portal-auth.service";
import { PortalUsersRepo, type PortalUserRow } from "./portal-users.repo";
import { PortalGroupsRepo } from "./portal-groups.repo";
import { isPortalPermissionKey, type PortalPermissionKey } from "./portal-permissions";

const PORTAL_PERMS_META = "subscribai:portal-perms";
const SUPERADMIN_ONLY_META = "subscribai:portal-superadmin";

export interface PortalRequest extends Request {
  portalUser?: PortalUserRow;
  portalToken?: string;
  portalPermissions?: Set<PortalPermissionKey>;
}

function extractBearer(req: Request): string | null {
  const raw = req.headers["authorization"];
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (!v) return null;
  const [scheme, token] = v.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token.trim();
}

/**
 * `PortalAuthGuard` — verifies a portal JWT, loads the row, attaches to req.
 * Rejects tokens with `principal !== "portal"` (customer tokens don't pass).
 */
@Injectable()
export class PortalAuthGuard implements CanActivate {
  constructor(private readonly auth: PortalAuthService, private readonly users: PortalUsersRepo) {}
  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<PortalRequest>();
    const token = extractBearer(req);
    if (!token) throw new UnauthorizedException("Missing portal Bearer token");
    const payload = this.auth.verifyJwt(token);
    const user = await this.users.findById(payload.sub);
    if (!user) throw new UnauthorizedException("Portal user no longer exists");
    if (user.status !== "active") throw new UnauthorizedException(`Portal user is ${user.status}`);
    req.portalUser = user;
    req.portalToken = token;
    return true;
  }
}

/**
 * `PortalPermissionGuard` — enforces `@RequirePortalPermission(key…)` on the
 * handler. All listed keys must be present in the user's resolved permission
 * set. Superadmin bypasses this entirely.
 */
@Injectable()
export class PortalPermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth: PortalAuthService,
    private readonly users: PortalUsersRepo,
    private readonly groups: PortalGroupsRepo,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<PortalRequest>();

    const superOnly = this.reflector.getAllAndOverride<boolean>(SUPERADMIN_ONLY_META, [ctx.getHandler(), ctx.getClass()]);
    const required = this.reflector.getAllAndOverride<PortalPermissionKey[]>(PORTAL_PERMS_META, [ctx.getHandler(), ctx.getClass()]);

    if (!superOnly && (!required || required.length === 0)) return true;

    // Reuse the identity established by PortalAuthGuard if it ran first.
    let user = req.portalUser;
    if (!user) {
      const token = extractBearer(req);
      if (!token) throw new UnauthorizedException("Missing portal Bearer token");
      const payload = this.auth.verifyJwt(token);
      const found = await this.users.findById(payload.sub);
      if (!found) throw new UnauthorizedException("Portal user no longer exists");
      if (found.status !== "active") throw new UnauthorizedException(`Portal user is ${found.status}`);
      user = found;
      req.portalUser = user;
      req.portalToken = token;
    }

    if (superOnly && !user.is_superadmin) throw new ForbiddenException("Superadmin only.");

    if (required && required.length > 0) {
      if (!user.is_superadmin) {
        const perms = await this.groups.permissionsForUser(user.id);
        req.portalPermissions = perms;
        for (const key of required) {
          if (!perms.has(key)) throw new ForbiddenException(`Missing portal permission: ${key}`);
        }
      }
    }
    return true;
  }
}

/**
 * Marks an endpoint as requiring a specific set of portal permission keys.
 * Also implicitly applies PortalAuthGuard + PortalPermissionGuard.
 */
export function RequirePortalPermission(...keys: PortalPermissionKey[]) {
  const sanitized = keys.filter(isPortalPermissionKey);
  return applyDecorators(
    SetMetadata(PORTAL_PERMS_META, sanitized),
    UseGuards(PortalAuthGuard, PortalPermissionGuard),
  );
}

/** Marks an endpoint as callable ONLY by a portal user with is_superadmin=true. */
export function RequireSuperadmin() {
  return applyDecorators(
    SetMetadata(SUPERADMIN_ONLY_META, true),
    UseGuards(PortalAuthGuard, PortalPermissionGuard),
  );
}
