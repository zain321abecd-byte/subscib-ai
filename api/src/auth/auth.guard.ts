import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { UsersRepo } from "./users.repo";
import { type AuthedRequest, extractBearerToken } from "./auth.types";

/**
 * Requires a valid JWT issued by our backend (POST /auth/login). The frontend
 * sends `Authorization: Bearer <jwt>`. On success, attaches the matching
 * public.users row to `req.user`.
 */
@Injectable()
export class AuthGuard implements CanActivate {
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
