import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
  applyDecorators,
  UseGuards,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { type AuthedRequest, extractBearerToken } from "./auth.types";
import { AdminGuard } from "./admin.guard";
import { PortalTokenHelper } from "./portal-token.helper";
import type { PermissionKey } from "./permissions";

const PERMISSION_META_KEY = "subscribai:required-permissions";

/**
 * Mark an endpoint with the permission keys the caller must hold. Multiple
 * keys are AND-ed (caller must have ALL listed permissions).
 *
 *   @RequirePermission("orders:read", "orders:revenue")
 *   getRevenueReport() { ... }
 *
 * Composes AdminGuard + PermissionGuard so a signed-in teammate is
 * required AND their portal-group union of permissions must include
 * every key listed. Superadmin bypasses.
 */
export function RequirePermission(...keys: PermissionKey[]) {
  return applyDecorators(
    SetMetadata(PERMISSION_META_KEY, keys),
    UseGuards(AdminGuard, PermissionGuard),
  );
}

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly portal: PortalTokenHelper,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<PermissionKey[]>(PERMISSION_META_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const req = context.switchToHttp().getRequest<AuthedRequest>();

    // AdminGuard usually runs first (via the @RequirePermission composition)
    // and stashes the resolved permission set on the request — reuse it to
    // avoid a second JWT verify + DB round trip.
    let isSuper: boolean | undefined = (req as any).portalIsSuper;
    let permissions: Set<string> | undefined = (req as any).portalPermissions;

    if (isSuper === undefined || permissions === undefined) {
      const token = req.accessToken || extractBearerToken(req);
      if (!token) throw new UnauthorizedException("Missing Bearer token");
      const principal = await this.portal.resolve(token);
      isSuper = principal.isSuper;
      permissions = principal.permissions;
      // Fill req.user so @CurrentUser() consumers still see something.
      req.user = {
        id: principal.id, email: principal.email, name: principal.name,
        role: isSuper ? "superadmin" : "admin",
        email_verified_at: new Date().toISOString(),
      };
      req.accessToken = token;
    }

    if (isSuper) return true;
    for (const key of required) {
      if (!permissions.has(key)) throw new ForbiddenException(`Missing permission: ${key}`);
    }
    return true;
  }
}
