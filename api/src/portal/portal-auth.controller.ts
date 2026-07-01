import { Body, Controller, Get, Post, Req, UnauthorizedException } from "@nestjs/common";
import { PortalAuthService } from "./portal-auth.service";
import { PortalInvitesService } from "./portal-invites.service";
import { PortalAuthGuard, type PortalRequest } from "./portal.guard";
import { UseGuards } from "@nestjs/common";

/**
 * Public-facing portal auth endpoints — login + invite acceptance + "me".
 * Sits at /portal/* so it's obvious these are the portal audience, distinct
 * from the storefront /auth/* endpoints.
 */
@Controller("portal")
export class PortalAuthController {
  constructor(
    private readonly auth: PortalAuthService,
    private readonly invites: PortalInvitesService,
  ) {}

  @Post("login")
  async login(@Body() body: { email?: string; password?: string }) {
    return this.auth.login({ email: body?.email || "", password: body?.password || "" });
  }

  /** POST /portal/accept-invite — invitee sets password + logs in via /portal/login. */
  @Post("accept-invite")
  async acceptInvite(@Body() body: { token?: string; password?: string; name?: string }) {
    return this.invites.accept({
      token: body?.token || "",
      password: body?.password || "",
      name: body?.name,
    });
  }

  @Get("me")
  @UseGuards(PortalAuthGuard)
  async me(@Req() req: PortalRequest) {
    if (!req.portalUser) throw new UnauthorizedException();
    return this.auth.me(req.portalUser.id);
  }
}
