import { Module, forwardRef } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { InternalOrAdminGuard } from "../notifications/internal-or-admin.guard";
import { DeliveryController } from "./delivery.controller";
import { DeliveryService } from "./delivery.service";
import { DeliveryRemindersService } from "./delivery-reminders.service";
import { WhatsappService } from "./whatsapp.service";

/**
 * Subscription Delivery Automation — WhatsApp delivery messages, templates,
 * the delivery log, and the renewal/expiry reminder cron.
 *
 * NotificationsModule provides EmailService (the optional "also email the
 * customer" channel); AuthModule provides PortalTokenHelper, which
 * InternalOrAdminGuard needs. Both are wrapped in forwardRef() because
 * AuthModule ↔ NotificationsModule is already a cycle.
 */
@Module({
  imports: [forwardRef(() => AuthModule), forwardRef(() => NotificationsModule)],
  controllers: [DeliveryController],
  providers: [DeliveryService, DeliveryRemindersService, WhatsappService, InternalOrAdminGuard],
  exports: [DeliveryService, WhatsappService],
})
export class DeliveryModule {}
