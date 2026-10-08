import { Injectable, Logger } from "@nestjs/common";
import { Interval } from "@nestjs/schedule";
import { SupabaseService } from "../supabase/supabase.service";

/**
 * Wallet top-ups paid through PayFast.
 *
 * PayFast tells us about a payment TWICE — once when the customer's browser
 * lands on SUCCESS_URL, and once server-to-server on the IPN. Both arrive at
 * PaymentsService.handleReturn, so everything here has to be safe to run more
 * than once with the same input. Crediting a wallet twice is real money lost.
 *
 * The idempotency key is panel_payment_requests.basket_id, which has a unique
 * index. The credit is guarded by a compare-and-set on that row: the update
 * only matches while status is still 'pending', so whichever callback arrives
 * first wins and the second one changes nothing.
 */

/** Basket ids we own. Anything else belongs to the shop's order flow. */
export const PANEL_BASKET_PREFIX = "PNL-";
const TOP_UP_TIMEOUT_MS = 30_000;
const AUTO_CANCEL_NOTE =
  "Cancelled automatically — PayFast payment was not completed within 30 seconds.";

export function isPanelBasket(basketId: string): boolean {
  return String(basketId || "").startsWith(PANEL_BASKET_PREFIX);
}

@Injectable()
export class PanelTopUpService {
  private readonly logger = new Logger(PanelTopUpService.name);

  constructor(private readonly supabase: SupabaseService) {}

  /** Keep abandoned gateway attempts out of pending totals, even off-page. */
  @Interval("expire-pending-payfast-topups", 5_000)
  async expirePendingPayFastTopUps(): Promise<void> {
    const cutoff = new Date(Date.now() - TOP_UP_TIMEOUT_MS).toISOString();
    const { data, error } = await this.supabase
      .admin()
      .from("panel_payment_requests")
      .update({
        status: "rejected",
        admin_note: AUTO_CANCEL_NOTE,
        reviewed_at: new Date().toISOString(),
      })
      .eq("gateway", "payfast")
      .eq("status", "pending")
      .is("gateway_txn_id", null)
      .lte("created_at", cutoff)
      .select("id");

    if (error) {
      this.logger.error(`pending PayFast expiry sweep failed: ${error.message}`);
    } else if (data?.length) {
      this.logger.log(`automatically cancelled ${data.length} expired PayFast top-up(s).`);
    }
  }

  /**
   * Apply a gateway outcome to a top-up request.
   *
   * Only called once the validation hash has already been verified by
   * PaymentsService — an unverified payload must never reach this.
   */
  async applyOutcome(params: {
    basketId: string;
    paymentStatus: "paid" | "failed" | "pending";
    transactionId: string;
    errCode: string;
    /** transaction_amount reported by PayFast, when present. */
    reportedAmount?: string;
  }): Promise<void> {
    const { basketId, paymentStatus, transactionId, errCode } = params;
    const db = this.supabase.admin();

    const { data: request, error } = await db
      .from("panel_payment_requests")
      .select("id, user_id, amount, status, gateway, admin_note")
      .eq("basket_id", basketId)
      .maybeSingle();

    if (error) {
      this.logger.error(`panel top-up lookup failed (basket=${basketId}): ${error.message}`);
      return;
    }
    if (!request) {
      this.logger.warn(`panel top-up: no request matched basket=${basketId}`);
      return;
    }
    if (request.gateway !== "payfast") {
      this.logger.warn(`panel top-up: basket=${basketId} is not a payfast request — ignoring.`);
      return;
    }

    const customerCancelled =
      request.status === "rejected" &&
      (String(request.admin_note || "").startsWith("Cancelled by customer") ||
        String(request.admin_note || "").startsWith("Cancelled automatically"));

    if (request.status !== "pending" && !(customerCancelled && paymentStatus === "paid")) {
      this.logger.log(
        `panel top-up basket=${basketId} already ${request.status} — ignoring duplicate callback.`,
      );
      return;
    }

    if (paymentStatus === "pending") {
      // Wallet methods sometimes redirect before settling. Leave the row alone
      // and wait for the IPN, which is authoritative.
      this.logger.log(`panel top-up basket=${basketId} still pending (err_code=${errCode}).`);
      return;
    }

    // ── validate amount before the atomic settlement ─────────────────────
    const expected = Number(request.amount);
    const reported = params.reportedAmount != null ? Number(params.reportedAmount) : null;

    // The validation hash covers basket/merchant/err_code but NOT the amount,
    // so a mismatch here is worth stopping for rather than guessing at. PayFast
    // fixes TXNAMT when the token is issued, so in practice this should never
    // fire — if it does, something is wrong enough to want a human.
    if (reported !== null && Number.isFinite(reported) && Math.abs(reported - expected) > 0.01) {
      this.logger.error(
        `panel top-up basket=${basketId} AMOUNT MISMATCH: expected ${expected}, gateway reported ${reported}. Not crediting.`,
      );
      await db
        .from("panel_payment_requests")
        .update({
          gateway_txn_id: transactionId || null,
          gateway_err_code: errCode || null,
          admin_note: `Amount mismatch: requested ${expected}, gateway reported ${reported}. Needs manual review.`,
        })
        .eq("id", request.id)
        .eq("status", "pending");
      return;
    }

    // The request transition and ledger credit happen in one PostgreSQL
    // transaction. Concurrent browser-return/IPN calls serialize on the
    // request row, so only one can create a wallet transaction.
    const { data: settled, error: settleError } = await db.rpc("panel_settle_payfast_topup_atomic", {
      p_request_id: request.id,
      p_outcome: paymentStatus,
      p_transaction_id: transactionId || "",
      p_err_code: errCode || "",
    });
    if (settleError) {
      this.logger.error(`panel top-up settlement failed (basket=${basketId}): ${settleError.message}`);
      return;
    }
    const row = Array.isArray(settled) ? settled[0] : settled;
    this.logger.log(`panel top-up basket=${basketId} result=${row?.result || "unknown"}.`);
  }
}
