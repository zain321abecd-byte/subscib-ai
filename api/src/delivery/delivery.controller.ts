import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Headers,
  Logger,
  Param,
  Patch,
  Post,
  Query,
  ServiceUnavailableException,
  UseGuards,
} from "@nestjs/common";
import { InternalOrAdminGuard } from "../notifications/internal-or-admin.guard";
import { DeliveryService } from "./delivery.service";
import { DeliveryRemindersService } from "./delivery-reminders.service";
import type { MessageTemplateRow, SendDeliveryInput } from "./delivery.types";

/**
 * Subscription Delivery Automation API.
 *
 * Called by the Next.js admin Server Actions with the shared internal token
 * (InternalOrAdminGuard also accepts a signed-in portal teammate's JWT, which
 * is what a direct call from the browser would carry). The *permission* check
 * — delivery:read / delivery:send / delivery:templates — happens in the
 * Server Action via requireAdmin(); this guard establishes that the caller is
 * trusted at all.
 */
@Controller("delivery")
export class DeliveryController {
  private readonly logger = new Logger(DeliveryController.name);

  constructor(
    private readonly delivery: DeliveryService,
    private readonly reminders: DeliveryRemindersService,
  ) {}

  @Get("status")
  @UseGuards(InternalOrAdminGuard)
  status() {
    return this.delivery.status();
  }

  // ── templates ──────────────────────────────────────────────────────────

  @Get("templates")
  @UseGuards(InternalOrAdminGuard)
  listTemplates(
    @Query("kind") kind?: string,
    @Query("language") language?: string,
    @Query("product_id") productId?: string,
    @Query("include_inactive") includeInactive?: string,
  ) {
    return this.delivery.listTemplates({
      kind,
      language,
      productId,
      includeInactive: includeInactive === "1" || includeInactive === "true",
    });
  }

  @Post("templates")
  @UseGuards(InternalOrAdminGuard)
  createTemplate(@Body() body: Partial<MessageTemplateRow> & { actorId?: string | null }) {
    return this.delivery.createTemplate(body);
  }

  @Patch("templates/:id")
  @UseGuards(InternalOrAdminGuard)
  updateTemplate(@Param("id") id: string, @Body() body: Partial<MessageTemplateRow>) {
    return this.delivery.updateTemplate(id, body);
  }

  @Delete("templates/:id")
  @UseGuards(InternalOrAdminGuard)
  deleteTemplate(@Param("id") id: string) {
    return this.delivery.deleteTemplate(id);
  }

  // ── compose / send ─────────────────────────────────────────────────────

  @Post("preview")
  @UseGuards(InternalOrAdminGuard)
  preview(@Body() body: any) {
    return this.delivery.preview(body ?? {});
  }

  @Post("send")
  @UseGuards(InternalOrAdminGuard)
  async send(@Body() body: SendDeliveryInput) {
    const result = await this.delivery.send(body);
    if (!result.ok && !result.duplicate) {
      this.logger.warn(`Delivery send to ${body.customerPhone} did not go out: ${result.error ?? "unknown error"}`);
    }
    return result;
  }

  // ── history ────────────────────────────────────────────────────────────

  @Get("messages")
  @UseGuards(InternalOrAdminGuard)
  listMessages(
    @Query("limit") limit?: string,
    @Query("status") status?: string,
    @Query("kind") kind?: string,
    @Query("channel") channel?: string,
    @Query("order_id") orderId?: string,
    @Query("sale_id") saleId?: string,
    @Query("search") search?: string,
  ) {
    return this.delivery.listMessages({
      limit: limit ? Number(limit) : undefined,
      status,
      kind,
      channel,
      orderId,
      saleId,
      search,
    });
  }

  @Get("messages/:id")
  @UseGuards(InternalOrAdminGuard)
  getMessage(@Param("id") id: string) {
    return this.delivery.getMessage(id);
  }

  @Post("messages/:id/resend")
  @UseGuards(InternalOrAdminGuard)
  resend(@Param("id") id: string, @Body() body: { force?: boolean; actor?: { id?: string; email?: string } }) {
    return this.delivery.resend(id, { force: body?.force ?? true, actor: body?.actor ?? null });
  }

  // ── cron ───────────────────────────────────────────────────────────────

  /**
   * Manual / external trigger for the renewal + expiry sweep. Guarded by the
   * same CRON_SECRET bearer as /cron/stock-expiry-reminders. The automatic
   * daily run lives in DeliveryRemindersService (@Cron).
   */
  @Get("cron/reminders")
  async cronReminders(
    @Headers("authorization") authHeader?: string,
    @Query("dry_run") dryRun?: string,
  ) {
    const secret = process.env.CRON_SECRET;
    if (!secret) throw new ServiceUnavailableException("CRON_SECRET is not configured.");
    if (authHeader !== `Bearer ${secret}`) throw new ForbiddenException("Unauthorized");
    return this.reminders.run({ dryRun: dryRun === "1" || dryRun === "true" });
  }
}
