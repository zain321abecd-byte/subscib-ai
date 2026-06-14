import { Module } from "@nestjs/common";
import { EmailService } from "./email.service";
import { StockRemindersService } from "./stock-reminders.service";
import { CronController } from "./cron.controller";

@Module({
  controllers: [CronController],
  providers: [EmailService, StockRemindersService],
  exports: [EmailService],
})
export class NotificationsModule {}
