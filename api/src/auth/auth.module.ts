import { Module, forwardRef } from "@nestjs/common";
import { NotificationsModule } from "../notifications/notifications.module";
import { AdminGuard } from "./admin.guard";
import { AuthController } from "./auth.controller";
import { AuthGuard } from "./auth.guard";
import { AuthService } from "./auth.service";
import { PermissionGuard } from "./permission.guard";
import { PortalTokenHelper } from "./portal-token.helper";
import { UsersRepo } from "./users.repo";

/**
 * Custom authentication built on public.users + bcrypt + JWT.
 *
 * AuthService injects EmailService (sendVerificationEmail) and
 * NotificationsModule uses AdminGuard on its admin routes — that's a
 * circular dependency, resolved with forwardRef() on both ends.
 */
@Module({
  imports: [forwardRef(() => NotificationsModule)],
  controllers: [AuthController],
  providers: [AuthService, UsersRepo, AuthGuard, AdminGuard, PermissionGuard, PortalTokenHelper],
  exports: [AuthService, UsersRepo, AuthGuard, AdminGuard, PermissionGuard, PortalTokenHelper],
})
export class AuthModule {}
