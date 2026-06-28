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
import { AuthGuard } from "./auth.guard";
import { AuthService } from "./auth.service";
import { UsersRepo } from "./users.repo";
import { hasPermissionFor, parseOverride, type PermissionKey, type Role } from "./permissions";
import { type AuthedRequest, extractBearerToken } from "./auth.types";

const PERMISSION_META_KEY = "subscribai:required-permissions";

/**
 * Mark an endpoint with the permission keys the caller must hold. Multiple
 * keys are AND-ed (caller must have ALL listed permissions).
 *
 *   @RequirePermission("orders:read", "orders:revenue")
 *   getRevenueReport() { ... }
 *
 * Applies AuthGuard + PermissionGuard together — the route is automatically
 * protected; no separate @UseGuards() is needed.
 */
export function RequirePermission(...keys: PermissionKey[]) {
  return applyDecorators(
    SetMetadata(PERMISSION_META_KEY, keys),
    UseGuards(AuthGuard, PermissionGuard),
  );
}

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth: AuthService,
    private readonly users: UsersRepo,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<PermissionKey[]>(PERMISSION_META_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true; // no @RequirePermission → pass

    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const token = req.accessToken || extractBearerToken(req);
    if (!token) throw new UnauthorizedException("Missing Bearer token");

    const payload = this.auth.verifyJwt(token);
    const user = await this.users.findById(payload.sub);
    if (!user) throw new UnauthorizedException("User no longer exists");
    if (!user.email_verified_at) throw new UnauthorizedException("Email not verified");

    const override = parseOverride(user.permissions);
    for (const key of required) {
      if (!hasPermissionFor(user.role as Role, override, key)) {
        throw new ForbiddenException(`Missing permission: ${key}`);
      }
    }

    // Surface the resolved user on the request — handlers can read @CurrentUser().
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
