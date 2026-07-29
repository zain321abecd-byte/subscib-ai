import { Module } from "@nestjs/common";
import { NotificationsModule } from "../notifications/notifications.module";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";
import { StaleOrdersController } from "./stale-orders.controller";
import { StaleOrdersService } from "./stale-orders.service";

@Module({
  imports: [NotificationsModule],
  controllers: [OrdersController, StaleOrdersController],
  providers: [OrdersService, StaleOrdersService],
  exports: [OrdersService, StaleOrdersService],
})
export class OrdersModule {}
