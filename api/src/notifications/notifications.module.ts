import { Module, forwardRef } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { EmailController } from "./email.controller";
import { EmailService } from "./email.service";
import { StockRemindersService } from "./stock-reminders.service";
import { CronController } from "./cron.controller";
import { InternalOrAdminGuard } from "./internal-or-admin.guard";

// AuthModule ↔ NotificationsModule is a circular dependency
// (AuthService needs EmailService for verification emails; the email/admin
// endpoints need AdminGuard from AuthModule). forwardRef() on both sides.
@Module({
  imports: [forwardRef(() => AuthModule)],
  controllers: [CronController, EmailController],
  providers: [EmailService, StockRemindersService, InternalOrAdminGuard],
  exports: [EmailService],
})
export class NotificationsModule {}
