import { Module } from "@nestjs/common";
import { OrdersModule } from "../orders/orders.module";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";
import { PanelTopUpService } from "./panel-topup.service";

@Module({
  imports: [OrdersModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, PanelTopUpService],
})
export class PaymentsModule {}
