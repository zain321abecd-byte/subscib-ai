import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { EmailController } from "./email.controller";
import { EmailService } from "./email.service";
import { StockRemindersService } from "./stock-reminders.service";
import { CronController } from "./cron.controller";

@Module({
  imports: [AuthModule],
  controllers: [CronController, EmailController],
  providers: [EmailService, StockRemindersService],
  exports: [EmailService],
})
export class NotificationsModule {}
