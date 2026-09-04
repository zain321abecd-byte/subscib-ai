import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { SupabaseService } from "../supabase/supabase.service";
import { DeliveryService } from "./delivery.service";
import { WhatsappService } from "./whatsapp.service";
import type { MessageKind } from "./delivery.types";

/**
 * Automatic customer notifications driven by public.subscription_sales
 * (the Daily Sales / Renewals table):
 *
 *   • renewal reminder — N days before renew_date (DELIVERY_REMINDER_DAYS_BEFORE,
 *     default 3), at most one per sale per day.
 *   • expiry notice    — once, after expiry_date has passed.
 *
 * Runs daily at 09:00 server time. Set TZ on the service if the exact local
 * hour matters (the stock sweep at 08:00 has the same caveat).
 *
 * The sweep is skipped when no WhatsApp API is configured — otherwise it would
 * pile up `pending` rows nobody ever sends. Set DELIVERY_REMINDERS_ENABLED=false
 * to turn it off entirely.
 */

interface SaleRow {
  id: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string;
  product_id: string | null;
  product_name: string;
  plan_name: string | null;
  sale_date: string;
  expiry_date: string;
  renew_date: string;
  status: string;
  last_reminder_sent_at: string | null;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function sameUtcDate(value: string | null, other: Date): boolean {
  if (!value) return false;
  const d = new Date(value);
  return (
    d.getUTCFullYear() === other.getUTCFullYear() &&
    d.getUTCMonth() === other.getUTCMonth() &&
    d.getUTCDate() === other.getUTCDate()
  );
}

@Injectable()
export class DeliveryRemindersService {
  private readonly logger = new Logger(DeliveryRemindersService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly delivery: DeliveryService,
    private readonly whatsapp: WhatsappService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_9AM, { name: "delivery-reminders" })
  async scheduled() {
    try {
      const result = await this.run();
      this.logger.log(
        `delivery-reminders ran: checked=${result.checked} renewals=${result.renewalsSent} expiries=${result.expirySent} skipped=${result.skipped}`,
      );
    } catch (err) {
      this.logger.error(`delivery-reminders failed: ${(err as Error).message}`);
    }
  }

  /** The sweep itself. Also exposed over HTTP for a manual/external trigger. */
  async run(opts: { dryRun?: boolean } = {}) {
    const enabled = (process.env.DELIVERY_REMINDERS_ENABLED || "true").toLowerCase() !== "false";
    if (!enabled) {
      return { ok: true, skipped: "disabled", checked: 0, renewalsSent: 0, expirySent: 0, results: [] as any[] };
    }
    if (this.whatsapp.provider() === "manual" && !opts.dryRun) {
      this.logger.warn("Skipping delivery-reminders — no WhatsApp API configured (provider=manual).");
      return { ok: true, skipped: "no_whatsapp_provider", checked: 0, renewalsSent: 0, expirySent: 0, results: [] as any[] };
    }

    const daysBefore = Number(process.env.DELIVERY_REMINDER_DAYS_BEFORE) >= 0
      ? Math.floor(Number(process.env.DELIVERY_REMINDER_DAYS_BEFORE))
      : 3;
    const language = (process.env.DELIVERY_DEFAULT_LANGUAGE || "en").toLowerCase();

    const today = todayIso();
    const now = new Date();
    const window = addDays(today, Number.isFinite(daysBefore) ? daysBefore : 3);

    const { data, error } = await this.supabase
      .admin()
      .from("subscription_sales")
      .select("id, customer_name, customer_email, customer_phone, product_id, product_name, plan_name, sale_date, expiry_date, renew_date, status, last_reminder_sent_at")
      .not("status", "in", "(renewed,cancelled)")
      .order("renew_date", { ascending: true });
    if (error) throw new Error(error.message);

    const sales = (data ?? []) as SaleRow[];
    const results: Array<{ saleId: string; kind: MessageKind; sent: boolean; error?: string }> = [];
    let renewalsSent = 0;
    let expirySent = 0;

    for (const sale of sales) {
      // ── expiry notice: once, after the subscription lapsed ──────────────
      if (sale.expiry_date < today) {
        if (await this.delivery.hasMessageForSale(sale.id, "expiry_notice")) continue;
        const outcome = await this.notify(sale, "expiry_notice", language, opts.dryRun);
        results.push({ saleId: sale.id, kind: "expiry_notice", ...outcome });
        if (outcome.sent) expirySent++;
        continue;
      }

      // ── renewal reminder: inside the reminder window, once a day ────────
      if (sale.renew_date >= today && sale.renew_date <= window) {
        if (sameUtcDate(sale.last_reminder_sent_at, now)) continue;
        const outcome = await this.notify(sale, "renewal_reminder", language, opts.dryRun);
        results.push({ saleId: sale.id, kind: "renewal_reminder", ...outcome });
        if (outcome.sent) {
          renewalsSent++;
          if (!opts.dryRun) {
            await this.supabase
              .admin()
              .from("subscription_sales")
              .update({ last_reminder_sent_at: now.toISOString() })
              .eq("id", sale.id);
          }
        }
      }
    }

    return { ok: true, checked: sales.length, renewalsSent, expirySent, skipped: null as string | null, results };
  }

  private async notify(
    sale: SaleRow,
    kind: MessageKind,
    language: string,
    dryRun?: boolean,
  ): Promise<{ sent: boolean; error?: string }> {
    if (dryRun) return { sent: false, error: "dry run" };
    try {
      const res = await this.delivery.send({
        kind,
        language,
        productId: sale.product_id,
        productName: sale.product_name,
        customerPhone: sale.customer_phone,
        customerName: sale.customer_name,
        customerEmail: sale.customer_email,
        saleId: sale.id,
        variables: {
          customer_name: sale.customer_name,
          subscription_name: sale.product_name,
          plan_name: sale.plan_name,
          start_date: sale.sale_date,
          renewal_date: sale.renew_date,
          expiry_date: sale.expiry_date,
        },
        actor: { id: null, email: "automation" },
      });
      if (res.ok) return { sent: true };
      return { sent: false, error: res.duplicate ? "duplicate" : res.error || "send failed" };
    } catch (err) {
      return { sent: false, error: err instanceof Error ? err.message : "send failed" };
    }
  }
}
