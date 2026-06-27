import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AuthGuard } from "./auth.guard";
import { AdminGuard } from "./admin.guard";
import { CurrentUser } from "./current-user.decorator";
import type { AuthUser } from "./auth.types";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** POST /auth/signup — create a new user (sends verification email). */
  @Post("signup")
  signup(@Body() body: { email?: string; password?: string; name?: string; phone?: string }) {
    return this.auth.signup({
      email: body?.email || "",
      password: body?.password || "",
      name: body?.name,
      phone: body?.phone,
    });
  }

  /** GET /auth/verify?token=... — confirm email via the link in the verification email. */
  @Get("verify")
  verify(@Query("token") token: string) {
    return this.auth.verify(token);
  }

  /** POST /auth/login — returns { accessToken, user } on success. */
  @Post("login")
  login(@Body() body: { email?: string; password?: string }) {
    return this.auth.login({ email: body?.email || "", password: body?.password || "" });
  }

  /** GET /auth/me — current user from JWT. */
  @Get("me")
  @UseGuards(AuthGuard)
  me(@CurrentUser() user: AuthUser) {
    return { user };
  }

  /** GET /auth/admin-check — smoke test for AdminGuard. */
  @Get("admin-check")
  @UseGuards(AdminGuard)
  adminCheck(@CurrentUser() user: AuthUser) {
    return { ok: true, admin: true, id: user.id, email: user.email };
  }
}
