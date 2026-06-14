import { Module } from "@nestjs/common";
import { PublicController } from "./public.controller";
import { FxService } from "./fx.service";
import { TrafficService } from "./traffic.service";

@Module({
  controllers: [PublicController],
  providers: [FxService, TrafficService],
})
export class PublicModule {}
