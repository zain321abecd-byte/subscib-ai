import { All, Body, Controller, Get, Post, Query, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { PaymentsService, type InitPaymentInput, type PayFastReturnPayload } from "./payments.service";

@Controller("payments")
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  /**
   * POST /payments/init — STEP 1+2 of the PayFast handshake.
   * Body: basketId, amount, customerEmail, customerMobile, customerName?, items?
   * Returns the form action URL + a map of hidden fields the browser should
   * auto-submit so the customer lands on PayFast's hosted checkout.
   */
  @Post("init")
  async init(@Body() body: InitPaymentInput, @Req() req: Request, @Res() res: Response) {
    const customerIp = String(
      req.headers["x-forwarded-for"] ||
      req.headers["x-real-ip"] ||
      req.ip ||
      ""
    ).split(",")[0].trim();
    const result = await this.payments.initPayment({ ...body, customerIp: body.customerIp || customerIp });
    res.status(result.status).json(result.body);
  }

  /**
   * GET / POST /payments/return — STEP 3.
   * PayFast redirects the customer's browser here after they complete (or
   * cancel) payment on the hosted checkout page. We validate the hash, mark
   * the order in the DB, then 303 the customer to the frontend /thank-you.
   *
   * PDF Table 1.2 says method=GET, but we accept both to be defensive.
   */
  @All("return")
  async returnFromGateway(@Req() req: Request, @Res() res: Response) {
    const payload: PayFastReturnPayload = {
      ...(req.query as Record<string, string>),
      ...((req.body as Record<string, string>) || {}),
    };
    const result = await this.payments.handleReturn(payload);

    const accept = req.headers["accept"] || "";
    const wantsJson = accept.includes("application/json") && !accept.includes("text/html");
    if (wantsJson) {
      res.json({
        success: result.hashOk,
        basketId: result.basketId,
        paymentStatus: result.paymentStatus,
        errCode: result.errCode,
        errMsg: result.errMsg,
        hashOk: result.hashOk,
      });
      return;
    }

    const frontend = (process.env.FRONTEND_ORIGIN || "http://localhost:3001").split(",")[0].trim();
    const dest = new URL("/thank-you", frontend);
    if (result.basketId) dest.searchParams.set("orderId", result.basketId);
    dest.searchParams.set("status", result.paymentStatus);
    if (result.errCode) dest.searchParams.set("code", result.errCode);
    if (!result.hashOk) dest.searchParams.set("hashOk", "0");
    res.redirect(303, dest.toString());
  }

  /**
   * POST /payments/ipn — STEP 4 (server-to-server notification).
   * PayFast pings this URL with the transaction outcome. We verify the
   * SHA256 hash and update the order. Always 200 so PayFast doesn't retry
   * indefinitely on transient errors — they retry on non-2xx.
   */
  @All("ipn")
  async ipn(@Req() req: Request, @Res() res: Response) {
    const payload: PayFastReturnPayload = {
      ...(req.query as Record<string, string>),
      ...((req.body as Record<string, string>) || {}),
    };
    const result = await this.payments.handleIpn(payload);
    res.status(result.status).json(result.body);
  }

  /** GET /payments/status?basketId=... — poll for the thank-you page. */
  @Get("status")
  async status(@Query() query: { basketId?: string; basket_id?: string; orderId?: string }, @Res() res: Response) {
    const result = await this.payments.getStatus(query);
    res.status(result.status).json(result.body);
  }
}
