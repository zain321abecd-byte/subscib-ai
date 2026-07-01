import { BadRequestException, ConflictException, Inject, Injectable, Logger, NotFoundException, forwardRef } from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import * as crypto from "node:crypto";
import { EmailService } from "../notifications/email.service";
import { PortalAuthService } from "./portal-auth.service";
import { PortalGroupsRepo } from "./portal-groups.repo";
import { PortalUsersRepo, toPortalUserPublic, type PortalUserPublic } from "./portal-users.repo";
import type { PortalPermissionKey } from "./portal-permissions";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Random URL-safe token used in the invite link (32 bytes → 43 base64url chars). */
function newInviteToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

@Injectable()
export class PortalInvitesService {
  private readonly logger = new Logger(PortalInvitesService.name);

  constructor(
    private readonly users: PortalUsersRepo,
    private readonly groups: PortalGroupsRepo,
    private readonly auth: PortalAuthService,
    @Inject(forwardRef(() => EmailService)) private readonly email: EmailService,
  ) {}

  /** Send a fresh invitation. Fails if the email already exists as a portal user. */
  async invite(input: {
    email: string;
    name?: string | null;
    groupIds: string[];
    invitedBy: { id: string; name: string | null };
  }): Promise<{ user: PortalUserPublic }> {
    const email = (input.email || "").trim().toLowerCase();
    const name = (input.name || "").trim() || null;
    if (!EMAIL_RE.test(email)) throw new BadRequestException("Valid email is required.");

    const existing = await this.users.findByEmail(email);
    if (existing) {
      // If they've already been invited but not accepted, we treat this as a
      // resend rather than a duplicate — makes the UX forgiving.
      if (existing.status === "invited") {
        const rotated = await this.rotateAndEmail(existing.id, input.groupIds, input.invitedBy);
        return { user: rotated };
      }
      throw new ConflictException("A portal user with that email already exists.");
    }

    const token = newInviteToken();
    const row = await this.users.createInvite({ email, name, inviteToken: token, invitedBy: input.invitedBy.id });
    if (!row) throw new BadRequestException("Could not create the invitation.");

    // Attach group memberships up-front so accepting the invite lands the user
    // in the right groups without a second step.
    await this.applyGroupMemberships(row.id, input.groupIds);
    const groupNames = await this.groupNames(input.groupIds);

    this.email
      .sendPortalInviteEmail({ to: email, name, inviterName: input.invitedBy.name, token, groupNames })
      .catch((err) => this.logger.error(`invite email failed for ${email}: ${(err as Error).message}`));

    const groups = groupNames.map((n, i) => ({ id: input.groupIds[i], name: n }));
    return { user: toPortalUserPublic(row, groups) };
  }

  /** Resend a fresh token to an existing invited user. */
  async resend(userId: string, groupIdsOptional: string[] | undefined, invitedBy: { id: string; name: string | null }): Promise<PortalUserPublic> {
    const existing = await this.users.findById(userId);
    if (!existing) throw new NotFoundException("Portal user not found.");
    if (existing.status === "disabled") throw new BadRequestException("User is disabled — re-enable them first.");
    if (existing.status === "active") throw new BadRequestException("User has already accepted their invite.");
    return this.rotateAndEmail(userId, groupIdsOptional, invitedBy);
  }

  private async rotateAndEmail(
    userId: string,
    groupIdsOptional: string[] | undefined,
    invitedBy: { id: string; name: string | null },
  ): Promise<PortalUserPublic> {
    const token = newInviteToken();
    const rotated = await this.users.rotateInviteToken(userId, token);
    if (!rotated) throw new BadRequestException("Could not rotate invite token.");

    // Only touch groups if the caller explicitly passed a list — otherwise
    // keep existing memberships. This keeps the "resend" button simple.
    if (Array.isArray(groupIdsOptional)) {
      await this.applyGroupMemberships(userId, groupIdsOptional);
    }
    const groups = await this.groupsForUser(userId);
    const groupNames = groups.map((g) => g.name);

    this.email
      .sendPortalInviteEmail({ to: rotated.email, name: rotated.name, inviterName: invitedBy.name, token, groupNames })
      .catch((err) => this.logger.error(`resend invite email failed for ${rotated.email}: ${(err as Error).message}`));

    return toPortalUserPublic(rotated, groups);
  }

  /**
   * Public endpoint — invitee submits their new password. Returns the same
   * shape as /portal/login so the accept-invite page can drop the user
   * straight into the admin portal without a second sign-in step.
   */
  async accept(input: { token: string; password: string; name?: string }): Promise<{
    token: string;
    expires_at: string;
    user: PortalUserPublic;
    permissions: PortalPermissionKey[];
  }> {
    const token = (input.token || "").trim();
    const password = String(input.password || "");
    if (!token) throw new BadRequestException("Invitation token is required.");
    if (password.length < 8) throw new BadRequestException("Password must be at least 8 characters.");

    const existing = await this.users.findByInviteToken(token);
    if (!existing) throw new BadRequestException("Invitation link is invalid or has already been used.");
    if (existing.status === "disabled") throw new BadRequestException("This invitation was revoked.");

    const passwordHash = await bcrypt.hash(password, 12);
    const finalName = (input.name && input.name.trim().length > 0) ? input.name.trim() : existing.name;
    const activated = await this.users.completeInvite(existing.id, passwordHash, finalName);
    if (!activated) throw new BadRequestException("Could not activate account.");

    // Sign them in immediately — same JWT shape as /portal/login.
    const { token: jwtToken, expiresAt } = this.auth.signJwt(activated);
    const groups = await this.groupsForUser(activated.id);
    const perms = activated.is_superadmin
      ? []
      : (Array.from(await this.groups.permissionsForUser(activated.id)) as PortalPermissionKey[]);
    await this.users.touchLastLogin(activated.id);
    return {
      token: jwtToken,
      expires_at: expiresAt,
      user: toPortalUserPublic(activated, groups),
      permissions: perms,
    };
  }

  // ── helpers ────────────────────────────────────────────────────────────
  private async applyGroupMemberships(userId: string, groupIds: string[]) {
    // Validate every id exists before wiping. Silently ignore unknown ids.
    const known = await this.groups.list();
    const knownIds = new Set(known.map((g) => g.id));
    const clean = groupIds.filter((id) => knownIds.has(id));
    await this.groups.setMembership(userId, []);           // clear first — order matters
    for (const gid of clean) await this.groups.addMember(gid, userId);
  }

  private async groupsForUser(userId: string): Promise<Array<{ id: string; name: string }>> {
    const map = await this.users.membershipsForUsers([userId]);
    return map.get(userId) || [];
  }

  private async groupNames(groupIds: string[]): Promise<string[]> {
    if (groupIds.length === 0) return [];
    const all = await this.groups.list();
    const byId = new Map(all.map((g) => [g.id, g.name]));
    return groupIds.map((id) => byId.get(id)).filter((n): n is string => typeof n === "string");
  }
}
