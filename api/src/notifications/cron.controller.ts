import { Controller, ForbiddenException, Get, Headers, ServiceUnavailableException } from "@nestjs/common";
import { StockRemindersService } from "./stock-reminders.service";

/**
 * Manual trigger for the stock-expiry sweep, kept for parity with the old
 * Vercel cron HTTP endpoint and for an external scheduler / health probe.
 * Protected by the CRON_SECRET bearer, same as before. The automatic daily run
 * is handled by @Cron in StockRemindersService.
 */
@Controller("cron")
export class CronController {
  constructor(private readonly reminders: StockRemindersService) {}

  @Get("stock-expiry-reminders")
  async stockExpiry(@Headers("authorization") authHeader?: string) {
    const secret = process.env.CRON_SECRET;
    if (!secret) throw new ServiceUnavailableException("CRON_SECRET is not configured.");
    if (authHeader !== `Bearer ${secret}`) throw new ForbiddenException("Unauthorized");
    return this.reminders.run();
  }
}
