import { Injectable, Logger } from "@nestjs/common";
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

export function isPanelBasket(basketId: string): boolean {
  return String(basketId || "").startsWith(PANEL_BASKET_PREFIX);
}

@Injectable()
export class PanelTopUpService {
  private readonly logger = new Logger(PanelTopUpService.name);

  constructor(private readonly supabase: SupabaseService) {}

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
      .select("id, user_id, amount, status, gateway")
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

    // Already settled by the other callback. Nothing to do, and saying so at
    // debug level keeps the log honest about why a second call did nothing.
    if (request.status !== "pending") {
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

    if (paymentStatus === "failed") {
      await db
        .from("panel_payment_requests")
        .update({
          status: "failed",
          gateway_txn_id: transactionId || null,
          gateway_err_code: errCode || null,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", request.id)
        .eq("status", "pending");
      this.logger.log(`panel top-up basket=${basketId} failed (err_code=${errCode}).`);
      return;
    }

    // ── paid ──────────────────────────────────────────────────────────────
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

    // Compare-and-set: claim the row first. If this matches zero rows another
    // callback got here first and already credited — we must not credit again.
    const { data: claimed, error: claimError } = await db
      .from("panel_payment_requests")
      .update({
        status: "approved",
        gateway_txn_id: transactionId || null,
        gateway_err_code: errCode || null,
        paid_at: new Date().toISOString(),
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", request.id)
      .eq("status", "pending")
      .select("id, user_id, amount")
      .maybeSingle();

    if (claimError) {
      this.logger.error(`panel top-up claim failed (basket=${basketId}): ${claimError.message}`);
      return;
    }
    if (!claimed) {
      this.logger.log(`panel top-up basket=${basketId} claimed by a concurrent callback — not crediting twice.`);
      return;
    }

    const { data: tx, error: creditError } = await db
      .from("panel_wallet_transactions")
      .insert({
        user_id: claimed.user_id,
        type: "credit",
        amount: claimed.amount,
        reference: transactionId || basketId,
        note: "Wallet top-up — PayFast",
      })
      .select("id")
      .single();

    if (creditError || !tx) {
      // We claimed the row but the money never landed. Put it back to pending
      // so the IPN (or an admin) can retry, rather than leaving it marked paid
      // with no credit behind it.
      this.logger.error(
        `panel top-up basket=${basketId} credit FAILED after claim: ${creditError?.message}. Reverting to pending.`,
      );
      await db
        .from("panel_payment_requests")
        .update({ status: "pending", paid_at: null, reviewed_at: null })
        .eq("id", claimed.id);
      return;
    }

    await db
      .from("panel_payment_requests")
      .update({ transaction_id: tx.id })
      .eq("id", claimed.id);

    this.logger.log(
      `panel top-up basket=${basketId} credited ${claimed.amount} to user=${claimed.user_id} (txn=${transactionId || "-"}).`,
    );
  }
}
