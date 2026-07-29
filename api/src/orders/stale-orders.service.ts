import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { SupabaseService } from "../supabase/supabase.service";

/** Orders older than this with no confirmed payment are swept. */
const STALE_AFTER_MINUTES = 120;

/**
 * Marker written into `orders.notes` so a flagged order is only flagged once.
 * The sweep runs every 15 minutes and flagged orders stay `pending`, so without
 * this the same order would collect a new note on every pass.
 */
const REVIEW_MARKER = "[auto] payment-unconfirmed";

/**
 * Payment methods settled outside the gateway. A `whatsapp` order is arranged
 * and paid by hand, so "no gateway confirmation" is its normal state — never
 * cancel those.
 */
const MANUAL_METHODS = ["whatsapp"];

type StaleOrderRow = {
  id: string;
  order_number: string;
  status: string;
  transaction_id: string | null;
  payment_method: string | null;
  customer_email: string | null;
  notes: string | null;
  created_at: string;
};

export type SweepResult = {
  cutoff: string;
  examined: number;
  cancelled: string[];
  flagged: string[];
  skippedManual: string[];
  alreadyFlagged: number;
  errors: string[];
};

/**
 * Closes out orders that never got a confirmed payment.
 *
 * The important subtlety: `pending` does not reliably mean unpaid. An order only
 * becomes `paid` through `handleReturn` (browser redirect) or `handleIpn`
 * (server-to-server callback). If a customer pays and then closes the tab while
 * the IPN also fails to arrive, the order sits `pending` even though the money
 * was taken — and `PaymentsService.getStatus()` cannot tell us otherwise,
 * because it reads our own `orders` table rather than asking the gateway.
 *
 * So the sweep splits on `transaction_id`, which is only written once the
 * gateway has responded about that basket:
 *
 *   - no transaction_id  -> the customer never got through the gateway
 *                           handshake. Safe to cancel.
 *   - has transaction_id -> the gateway was involved and this may be a paid
 *                           order with a lost callback. Flag for a human;
 *                           never cancel automatically.
 *
 * Cancelling releases nothing — order creation does not decrement stock — so
 * this is purely a status change and is safe to re-run.
 */
@Injectable()
export class StaleOrdersService {
  private readonly logger = new Logger(StaleOrdersService.name);

  constructor(private readonly supabase: SupabaseService) {}

  @Cron(CronExpression.EVERY_30_MINUTES, { name: "stale-order-sweep" })
  async scheduled() {
    try {
      const r = await this.run();
      this.logger.log(
        `stale-order-sweep: examined=${r.examined} cancelled=${r.cancelled.length} ` +
          `flagged=${r.flagged.length} alreadyFlagged=${r.alreadyFlagged} ` +
          `skippedManual=${r.skippedManual.length} errors=${r.errors.length}`,
      );
      for (const e of r.errors) this.logger.warn(`stale-order-sweep: ${e}`);
    } catch (err) {
      this.logger.error(`stale-order-sweep failed: ${(err as Error).message}`);
    }
  }

  /** The sweep itself. Returns a summary; also used by the manual trigger. */
  async run(staleAfterMinutes = STALE_AFTER_MINUTES): Promise<SweepResult> {
    const cutoff = new Date(Date.now() - staleAfterMinutes * 60_000).toISOString();
    const supabase = this.supabase.admin();

    const result: SweepResult = {
      cutoff,
      examined: 0,
      cancelled: [],
      flagged: [],
      skippedManual: [],
      alreadyFlagged: 0,
      errors: [],
    };

    const { data, error } = await supabase
      .from("orders")
      .select("id, order_number, status, transaction_id, payment_method, customer_email, notes, created_at")
      .eq("status", "pending")
      .lt("created_at", cutoff);

    if (error) {
      result.errors.push(`select failed: ${error.message}`);
      return result;
    }

    const rows = (data ?? []) as StaleOrderRow[];
    result.examined = rows.length;

    for (const order of rows) {
      const method = (order.payment_method ?? "").toLowerCase();
      if (MANUAL_METHODS.includes(method)) {
        result.skippedManual.push(order.order_number);
        continue;
      }

      // Gateway responded about this basket at some point — could be paid with a
      // lost callback, so a human decides.
      if (order.transaction_id) {
        if ((order.notes ?? "").includes(REVIEW_MARKER)) {
          result.alreadyFlagged += 1;
          continue;
        }
        const note = [
          order.notes?.trim(),
          `${REVIEW_MARKER} ${new Date().toISOString()} — still pending ${staleAfterMinutes}m after creation ` +
            `but transaction_id ${order.transaction_id} exists. Check the gateway before cancelling: ` +
            `the customer may have paid and the callback been lost.`,
        ]
          .filter(Boolean)
          .join("\n");

        const { error: flagErr } = await supabase
          .from("orders")
          .update({ notes: note, updated_at: new Date().toISOString() })
          .eq("id", order.id);

        if (flagErr) result.errors.push(`flag ${order.order_number}: ${flagErr.message}`);
        else result.flagged.push(order.order_number);
        continue;
      }

      // Never reached the gateway — safe to cancel.
      const { error: cancelErr } = await supabase
        .from("orders")
        .update({
          status: "cancelled",
          notes: [
            order.notes?.trim(),
            `[auto] cancelled ${new Date().toISOString()} — no payment confirmed and no transaction_id ` +
              `${staleAfterMinutes}m after creation.`,
          ]
            .filter(Boolean)
            .join("\n"),
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id)
        // Re-assert the status in the WHERE clause so a payment that lands
        // between our SELECT and this UPDATE is not overwritten.
        .eq("status", "pending");

      if (cancelErr) result.errors.push(`cancel ${order.order_number}: ${cancelErr.message}`);
      else result.cancelled.push(order.order_number);
    }

    return result;
  }
}
