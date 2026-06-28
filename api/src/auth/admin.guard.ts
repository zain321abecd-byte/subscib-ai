import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { UsersRepo } from "./users.repo";
import { type AuthedRequest, extractBearerToken } from "./auth.types";

/**
 * Requires an authenticated user whose public.users.role === 'admin'.
 *
 * This guard is the real protection on admin endpoints — feature services
 * use the service-role Supabase client which bypasses RLS, so admin status
 * MUST be enforced here.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private readonly auth: AuthService,
    private readonly users: UsersRepo,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const token = extractBearerToken(req);
    if (!token) throw new UnauthorizedException("Missing Bearer token");

    const payload = this.auth.verifyJwt(token);
    const user = await this.users.findById(payload.sub);
    if (!user) throw new UnauthorizedException("User no longer exists");
    if (!user.email_verified_at) throw new UnauthorizedException("Email not verified");
    // Any back-office role can hit endpoints gated by AdminGuard — customers
    // can't. Finer-grained access (e.g. only managers can refund) is enforced
    // by @RequirePermission(...) on the specific routes that need it.
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
