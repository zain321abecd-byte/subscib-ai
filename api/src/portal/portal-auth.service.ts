import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import * as jwt from "jsonwebtoken";
import { PortalUsersRepo, type PortalUserRow, toPortalUserPublic, type PortalUserPublic } from "./portal-users.repo";
import { PortalGroupsRepo } from "./portal-groups.repo";
import type { PortalPermissionKey } from "./portal-permissions";

/**
 * JWT issued for the back-office ("portal") principal. `principal` = "portal"
 * is what our PortalAuthGuard checks — a storefront customer JWT (with
 * principal = "customer" from the existing AuthService) cannot pass.
 */
export interface PortalJwtPayload {
  sub: string;             // portal_users.id
  email: string;
  principal: "portal";
  isSuper: boolean;
}

@Injectable()
export class PortalAuthService {
  private readonly logger = new Logger(PortalAuthService.name);

  constructor(
    private readonly users: PortalUsersRepo,
    private readonly groups: PortalGroupsRepo,
  ) {}

  private secret(): string {
    const s = process.env.JWT_SECRET;
    if (!s || s.length < 32) throw new Error("JWT_SECRET missing or too short (32+ chars required).");
    return s;
  }

  signJwt(user: PortalUserRow): { token: string; expiresAt: string } {
    const payload: PortalJwtPayload = {
      sub: user.id,
      email: user.email,
      principal: "portal",
      isSuper: user.is_superadmin,
    };
    const ttl = process.env.JWT_ACCESS_TTL || "7d";
    const token = jwt.sign(payload, this.secret(), { expiresIn: ttl as jwt.SignOptions["expiresIn"] });
    // Decode our own token to surface the exp back to the caller — cheaper
    // than re-deriving the TTL and correct even for weird ttl strings.
    const decoded = jwt.decode(token) as { exp?: number } | null;
    const expiresAt = decoded?.exp ? new Date(decoded.exp * 1000).toISOString() : new Date(Date.now() + 7 * 86400_000).toISOString();
    return { token, expiresAt };
  }

  verifyJwt(token: string): PortalJwtPayload {
    try {
      const decoded = jwt.verify(token, this.secret()) as jwt.JwtPayload & Partial<PortalJwtPayload>;
      if (decoded.principal !== "portal") {
        throw new UnauthorizedException("Wrong token audience — not a portal token.");
      }
      return {
        sub: String(decoded.sub || ""),
        email: String(decoded.email || ""),
        principal: "portal",
        isSuper: Boolean(decoded.isSuper),
      };
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException("Invalid or expired portal token");
    }
  }

  /**
   * Login for a portal teammate. Rejects invited-but-not-accepted users AND
   * disabled ones. Returns the JWT + a public user projection.
   */
  async login(input: { email: string; password: string }): Promise<{ token: string; expires_at: string; user: PortalUserPublic; permissions: PortalPermissionKey[] }> {
    const email = (input.email || "").trim().toLowerCase();
    const password = String(input.password || "");

    if (!email || !password) throw new UnauthorizedException("Email and password are required.");
    const user = await this.users.findByEmail(email);

    // Constant-time-ish: always run bcrypt so we don't leak email existence.
    const hashToCompare = user?.password_hash || "$2a$12$invalidsaltinvalidsaltinvalidsaltinvalidsalti";
    const ok = await bcrypt.compare(password, hashToCompare);

    if (!user || !ok) throw new UnauthorizedException("Invalid email or password.");
    if (user.status === "invited") throw new UnauthorizedException("Please accept your invite email first, then sign in.");
    if (user.status === "disabled") throw new UnauthorizedException("Your portal access has been disabled. Contact a superadmin.");
    if (!user.password_hash) throw new UnauthorizedException("Account has no password set.");

    await this.users.touchLastLogin(user.id);
    const { token, expiresAt } = this.signJwt(user);
    const perms = user.is_superadmin ? [] : Array.from(await this.groups.permissionsForUser(user.id));
    return { token, expires_at: expiresAt, user: toPortalUserPublic(user), permissions: perms };
  }

  /** Resolve the currently-signed-in portal user + their permissions. */
  async me(userId: string): Promise<{ user: PortalUserPublic; permissions: PortalPermissionKey[]; isSuper: boolean }> {
    const user = await this.users.findById(userId);
    if (!user || user.status !== "active") throw new UnauthorizedException("Portal user not found or inactive.");
    const perms = user.is_superadmin ? [] : Array.from(await this.groups.permissionsForUser(user.id));
    return { user: toPortalUserPublic(user), permissions: perms, isSuper: user.is_superadmin };
  }
}
