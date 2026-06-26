import { Body, Controller, Param, Patch, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import { extractBearerToken } from "../auth/auth.types";
import { OrdersService } from "./orders.service";

@Controller("orders")
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  /**
   * POST /orders — record an order. Public (anonymous checkout allowed), but if
   * a Bearer token is present we attach the order to that user.
   */
  @Post()
  async create(@Body() body: any, @Req() req: Request) {
    console.log("POST /orders hit", body?.customer_email);
    const token = extractBearerToken(req) ?? undefined;
    return this.orders.create(body, token);
  }

  /**
   * PATCH /orders/:id — advance status / set transaction_id / notes. Public,
   * because the PayFast IPN is unauthenticated; gated by the limited
   * field whitelist + transaction_id correlation. Admin UI uses the same route.
   */
  @Patch(":id")
  async update(@Param("id") id: string, @Body() body: any) {
    return this.orders.update(id, body);
  }
}
