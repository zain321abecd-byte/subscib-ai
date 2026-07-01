import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { type AuthedRequest, extractBearerToken } from "./auth.types";
import { PortalTokenHelper } from "./portal-token.helper";

/**
 * Any active portal user (Editor / Manager / Admin / Superadmin) can pass
 * this guard — it's the "you are a signed-in teammate" gate. Finer
 * per-permission checks live in @RequirePermission(...).
 *
 * The name is historical — before the portal_users cutover this guard
 * validated a customer JWT + checked public.users.role. It now validates
 * a portal JWT. Every existing @UseGuards(AdminGuard) controller keeps
 * working with no code change on the controller side.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly portal: PortalTokenHelper) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const token = extractBearerToken(req);
    if (!token) throw new UnauthorizedException("Missing Bearer token");

    const principal = await this.portal.resolve(token);

    // Populate req.user in a shape compatible with the old AdminGuard so any
    // downstream code that reads @CurrentUser() doesn't need to change.
    req.user = {
      id: principal.id,
      email: principal.email,
      name: principal.name,
      role: principal.isSuper ? "superadmin" : "admin",
      email_verified_at: new Date().toISOString(),
    };
    req.accessToken = token;
    // Stash the permission set for PermissionGuard to reuse without re-hitting the DB.
    (req as any).portalPermissions = principal.permissions;
    (req as any).portalIsSuper = principal.isSuper;
    return true;
  }
}
