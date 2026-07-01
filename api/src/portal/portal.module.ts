import { Module, forwardRef } from "@nestjs/common";
import { NotificationsModule } from "../notifications/notifications.module";
import { PortalAuthController } from "./portal-auth.controller";
import { PortalAuthService } from "./portal-auth.service";
import { PortalGroupsController } from "./portal-groups.controller";
import { PortalGroupsRepo } from "./portal-groups.repo";
import { PortalInvitesService } from "./portal-invites.service";
import { PortalUsersController } from "./portal-users.controller";
import { PortalUsersRepo } from "./portal-users.repo";
import { PortalAuthGuard, PortalPermissionGuard } from "./portal.guard";

/**
 * Everything the back-office needs: teammate accounts, invitation flow,
 * groups + permissions, guards.
 *
 * The forwardRef on NotificationsModule breaks the cycle
 * PortalInvitesService → EmailService → (already imports Portal for
 * PortalAdminGuard eventually). SupabaseService comes from the global
 * SupabaseModule so it just injects.
 */
@Module({
  imports: [forwardRef(() => NotificationsModule)],
  controllers: [PortalAuthController, PortalUsersController, PortalGroupsController],
  providers: [
    PortalUsersRepo,
    PortalGroupsRepo,
    PortalAuthService,
    PortalInvitesService,
    PortalAuthGuard,
    PortalPermissionGuard,
  ],
  exports: [PortalAuthService, PortalUsersRepo, PortalGroupsRepo, PortalAuthGuard, PortalPermissionGuard],
})
export class PortalModule {}
