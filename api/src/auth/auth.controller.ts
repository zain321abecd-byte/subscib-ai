import { Controller, Get, UseGuards } from "@nestjs/common";
import type { User } from "@supabase/supabase-js";
import { AuthGuard } from "./auth.guard";
import { AdminGuard } from "./admin.guard";
import { CurrentUser } from "./current-user.decorator";

@Controller("auth")
export class AuthController {
  /** Returns the current user — smoke test for AuthGuard / Bearer wiring. */
  @Get("me")
  @UseGuards(AuthGuard)
  me(@CurrentUser() user: User) {
    return { id: user.id, email: user.email };
  }

  /** Confirms the caller is an admin — smoke test for AdminGuard. */
  @Get("admin-check")
  @UseGuards(AdminGuard)
  adminCheck(@CurrentUser() user: User) {
    return { ok: true, admin: true, id: user.id, email: user.email };
  }
}
