import { Controller, ForbiddenException, Get, Headers, Query, ServiceUnavailableException } from "@nestjs/common";
import { StaleOrdersService } from "./stale-orders.service";

/**
 * Manual trigger for the stale-order sweep, mirroring CronController's
 * stock-expiry endpoint: same `/cron` prefix, same CRON_SECRET bearer.
 *
 * It lives in OrdersModule rather than being added to CronController because
 * NotificationsModule (which owns CronController) is already imported by
 * OrdersModule — wiring it the other way would need forwardRef on both sides to
 * survive the circular reference. Nest is happy for two controllers to share a
 * route prefix as long as the paths differ.
 *
 * The automatic run is @Cron in StaleOrdersService, every 30 minutes.
 */
@Controller("cron")
export class StaleOrdersController {
  constructor(private readonly staleOrders: StaleOrdersService) {}

  @Get("stale-orders")
  async sweep(
    @Headers("authorization") authHeader?: string,
    @Query("minutes") minutes?: string,
  ) {
    const secret = process.env.CRON_SECRET;
    if (!secret) throw new ServiceUnavailableException("CRON_SECRET is not configured.");
    if (authHeader !== `Bearer ${secret}`) throw new ForbiddenException("Unauthorized");

    // `?minutes=` overrides the 120-minute cutoff for a single call. A large
    // value matches nothing, which makes it a safe dry run — e.g.
    // `?minutes=100000` returns an empty summary without touching any order.
    const parsed = Number(minutes);
    return this.staleOrders.run(Number.isFinite(parsed) && parsed > 0 ? parsed : undefined);
  }
}
