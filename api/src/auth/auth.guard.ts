import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { SupabaseService } from "../supabase/supabase.service";
import { type AuthedRequest, extractBearerToken } from "./auth.types";

/**
 * Requires a valid Supabase session. The frontend must send the user's access
 * token as `Authorization: Bearer <token>`. On success, attaches `user` and
 * `accessToken` to the request.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly supabase: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const token = extractBearerToken(req);
    if (!token) throw new UnauthorizedException("Missing Bearer token");

    const user = await this.supabase.getUser(token);
    if (!user) throw new UnauthorizedException("Invalid or expired session");

    req.user = user;
    req.accessToken = token;
    return true;
  }
}
