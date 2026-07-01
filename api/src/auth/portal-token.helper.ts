import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import * as jwt from "jsonwebtoken";
import { SupabaseService } from "../supabase/supabase.service";

/**
 * Shared portal-JWT verifier for the customer-side `auth/` guards.
 *
 * Historically AdminGuard + PermissionGuard verified a customer JWT and
 * checked public.users.role. Since the portal was carved out into its
 * own audience (portal_users + portal_groups), those guards need to
 * accept the portal token instead. This helper does that resolution
 * without pulling PortalModule into AuthModule (which would create yet
 * another dep cycle through NotificationsModule).
 *
 * A resolved principal here looks the same to callers regardless of
 * whether they use AdminGuard or PermissionGuard — one shape.
 */
export interface PortalPrincipal {
  id: string;
  email: string;
  name: string | null;
  isSuper: boolean;
  permissions: Set<string>;
}

@Injectable()
export class PortalTokenHelper {
  private readonly logger = new Logger(PortalTokenHelper.name);
  constructor(private readonly supabase: SupabaseService) {}

  private secret(): string {
    const s = process.env.JWT_SECRET;
    if (!s || s.length < 32) throw new Error("JWT_SECRET missing or too short (32+ chars required).");
    return s;
  }

  /** Verify a raw Bearer string as a portal JWT and load the portal user + effective permissions. */
  async resolve(token: string): Promise<PortalPrincipal> {
    let decoded: jwt.JwtPayload;
    try {
      decoded = jwt.verify(token, this.secret()) as jwt.JwtPayload;
    } catch {
      throw new UnauthorizedException("Invalid or expired portal token");
    }
    if ((decoded as any).principal !== "portal") {
      throw new UnauthorizedException("Wrong token audience — not a portal token.");
    }
    const sub = String(decoded.sub || "");
    if (!sub) throw new UnauthorizedException("Malformed portal token");

    const admin = this.supabase.admin();
    const { data: user, error } = await admin
      .from("portal_users")
      .select("id, email, name, status, is_superadmin")
      .eq("id", sub)
      .maybeSingle();
    if (error) {
      this.logger.error(`portal_users lookup failed: ${error.message}`);
      throw new UnauthorizedException("Cannot verify portal user");
    }
    if (!user) throw new UnauthorizedException("Portal user no longer exists");
    if (user.status !== "active") throw new UnauthorizedException("Portal account is not active");

    // Superadmin bypasses every permission check — leave the set empty and
    // let callers short-circuit on isSuper.
    const permissions = new Set<string>();
    if (!user.is_superadmin) {
      const { data: rows } = await admin
        .from("portal_group_members")
        .select("portal_groups(permissions)")
        .eq("user_id", user.id);
      type Row = { portal_groups: { permissions: unknown } | Array<{ permissions: unknown }> | null };
      for (const row of ((rows || []) as unknown) as Row[]) {
        const g = Array.isArray(row.portal_groups) ? row.portal_groups[0] : row.portal_groups;
        const perms = g?.permissions;
        if (!Array.isArray(perms)) continue;
        for (const k of perms) if (typeof k === "string") permissions.add(k);
      }
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      isSuper: !!user.is_superadmin,
      permissions,
    };
  }
}
