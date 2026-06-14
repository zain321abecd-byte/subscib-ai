import { Body, Controller, Get, Headers, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import { extractBearerToken } from "../auth/auth.types";
import { FxService } from "./fx.service";
import { TrafficService } from "./traffic.service";

@Controller()
export class PublicController {
  constructor(
    private readonly fx: FxService,
    private readonly traffic: TrafficService,
  ) {}

  /** GET /fx-rate — live USD→PKR/INR rates (cached 1h). */
  @Get("fx-rate")
  async fxRate() {
    return this.fx.getRates();
  }

  /** POST /traffic — anonymous-friendly analytics capture. */
  @Post("traffic")
  async captureTraffic(@Body() body: any, @Req() req: Request, @Headers("user-agent") ua?: string) {
    const token = extractBearerToken(req) ?? undefined;
    return this.traffic.capture(body || {}, ua || "", token);
  }
}
