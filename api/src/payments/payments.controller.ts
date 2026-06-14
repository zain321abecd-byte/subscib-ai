import { Body, Controller, Get, Post, Query, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { PaymentsService, type CreatePaymentInput, type PaymentStatusQuery } from "./payments.service";
import { normalizePaymentStatus } from "./sahulatpay";

@Controller("payments")
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  /** POST /payments — initiate a JazzCash / Easypaisa / Card payment. */
  @Post()
  async create(@Body() body: CreatePaymentInput, @Res() res: Response) {
    const result = await this.payments.createPayment(body);
    res.status(result.status).json(result.body);
  }

  /** GET /payments/status — poll a payment's status from the gateway. */
  @Get("status")
  async status(@Query() query: PaymentStatusQuery, @Res() res: Response) {
    const result = await this.payments.getStatus(query);
    res.status(result.status).json(result.body);
  }

  /** POST /payments/callback — server-to-server notification from SahulatPay. */
  @Post("callback")
  async callbackPost(@Body() body: Record<string, any>, @Res() res: Response) {
    const out = await this.payments.handleCallback(body || {}, "POST");
    res.json(out);
  }

  /**
   * GET /payments/callback — browser redirect-back after hosted card payment.
   * Records status best-effort, then HTML-redirects the user to the frontend
   * thank-you page (unless the caller explicitly wants JSON).
   */
  @Get("callback")
  async callbackGet(@Req() req: Request, @Res() res: Response) {
    const payload: Record<string, any> = { ...(req.query as Record<string, any>) };
    const orderId = String(payload.order_id || payload.orderId || payload.transactionId || "").trim();
    const paymentStatus = normalizePaymentStatus(payload.status || payload.transactionStatus || payload.responseDesc || "");

    await this.payments.handleCallback(payload, "GET");

    const accept = req.headers["accept"] || "";
    const wantsJson = accept.includes("application/json") && !accept.includes("text/html");
    if (wantsJson) {
      res.json(await this.payments.handleCallback(payload, "GET"));
      return;
    }

    const frontend = (process.env.FRONTEND_ORIGIN || "http://localhost:3001").split(",")[0].trim();
    const dest = new URL("/thank-you", frontend);
    if (orderId) dest.searchParams.set("orderId", orderId);
    if (paymentStatus) dest.searchParams.set("status", paymentStatus);
    res.redirect(303, dest.toString());
  }
}
