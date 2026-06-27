import { Module } from "@nestjs/common";
import { NotificationsModule } from "../notifications/notifications.module";
import { AdminGuard } from "./admin.guard";
import { AuthController } from "./auth.controller";
import { AuthGuard } from "./auth.guard";
import { AuthService } from "./auth.service";
import { UsersRepo } from "./users.repo";

/**
 * Custom authentication built on public.users + bcrypt + JWT. Replaces the
 * earlier Supabase-Auth-backed AuthGuard. SupabaseService is still used by
 * UsersRepo for DB access via the service-role client.
 */
@Module({
  imports: [NotificationsModule],
  controllers: [AuthController],
  providers: [AuthService, UsersRepo, AuthGuard, AdminGuard],
  exports: [AuthService, UsersRepo, AuthGuard, AdminGuard],
})
export class AuthModule {}
