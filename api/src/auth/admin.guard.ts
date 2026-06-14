import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { SupabaseService } from "../supabase/supabase.service";
import { type AuthedRequest, extractBearerToken } from "./auth.types";

/**
 * Requires an authenticated user who is also a member of the `admins` table.
 * Mirrors the old Next.js requireAdminForApi() + middleware gate.
 *
 * IMPORTANT: with the service-role client bypassing RLS in feature modules,
 * THIS GUARD is the real gate protecting admin data. It must stay airtight.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly supabase: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const token = extractBearerToken(req);
    if (!token) throw new UnauthorizedException("Missing Bearer token");

    const user = await this.supabase.getUser(token);
    if (!user) throw new UnauthorizedException("Invalid or expired session");

    const { data: adminRow, error } = await this.supabase
      .admin()
      .from("admins")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) throw new ForbiddenException("Could not verify admin status");
    if (!adminRow) throw new ForbiddenException("Admin access required");

    req.user = user;
    req.accessToken = token;
    return true;
  }
}
