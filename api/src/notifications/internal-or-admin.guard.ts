import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { PortalTokenHelper } from "../auth/portal-token.helper";
import { type AuthedRequest, extractBearerToken } from "../auth/auth.types";

/**
 * Allows a request if EITHER:
 *   1. it carries a valid `x-internal-token` header matching INTERNAL_API_TOKEN
 *      (server-to-server calls from the Next.js admin Server Actions), OR
 *   2. it carries a valid portal JWT (a signed-in teammate).
 */
@Injectable()
export class InternalOrAdminGuard implements CanActivate {
  constructor(private readonly portal: PortalTokenHelper) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthedRequest>();

    // 1 — trusted server-to-server token.
    const secret = process.env.INTERNAL_API_TOKEN;
    const provided = req.headers["x-internal-token"];
    if (secret && typeof provided === "string" && provided === secret) {
      return true;
    }

    // 2 — fall back to an authenticated portal teammate.
    const token = extractBearerToken(req);
    if (!token) throw new UnauthorizedException("Missing Bearer token or internal token");

    const principal = await this.portal.resolve(token);
    req.user = {
      id: principal.id,
      email: principal.email,
      name: principal.name,
      role: principal.isSuper ? "superadmin" : "admin",
      email_verified_at: new Date().toISOString(),
    };
    req.accessToken = token;
    (req as any).portalPermissions = principal.permissions;
    (req as any).portalIsSuper = principal.isSuper;
    return true;
  }
}
