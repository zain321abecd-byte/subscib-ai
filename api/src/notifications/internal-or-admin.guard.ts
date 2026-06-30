import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { UsersRepo } from "../auth/users.repo";
import { type AuthedRequest, extractBearerToken } from "../auth/auth.types";

/**
 * Allows a request if EITHER:
 *   1. it carries a valid `x-internal-token` header matching INTERNAL_API_TOKEN
 *      (server-to-server calls from the Next.js admin Server Actions), OR
 *   2. it carries a back-office admin JWT (legacy direct calls).
 *
 * This lets the admin email page reuse the API's already-working SMTP config
 * without duplicating credentials into the Next.js environment.
 */
@Injectable()
export class InternalOrAdminGuard implements CanActivate {
  constructor(
    private readonly auth: AuthService,
    private readonly users: UsersRepo,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthedRequest>();

    // 1 — trusted server-to-server token.
    const secret = process.env.INTERNAL_API_TOKEN;
    const provided = req.headers["x-internal-token"];
    if (secret && typeof provided === "string" && provided === secret) {
      return true;
    }

    // 2 — fall back to an authenticated back-office user.
    const token = extractBearerToken(req);
    if (!token) throw new UnauthorizedException("Missing Bearer token or internal token");

    const payload = this.auth.verifyJwt(token);
    const user = await this.users.findById(payload.sub);
    if (!user) throw new UnauthorizedException("User no longer exists");
    if (!user.email_verified_at) throw new UnauthorizedException("Email not verified");

    const backOfficeRoles = new Set(["superadmin", "admin", "manager", "editor"]);
    if (!backOfficeRoles.has(user.role)) throw new ForbiddenException("Admin access required");

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      email_verified_at: user.email_verified_at,
    };
    req.accessToken = token;
    return true;
  }
}
