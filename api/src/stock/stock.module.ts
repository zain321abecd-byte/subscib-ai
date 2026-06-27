import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { StockController } from "./stock.controller";
import { StockService } from "./stock.service";

// AuthModule needed for AdminGuard on the admin stock routes.
@Module({
  imports: [AuthModule],
  controllers: [StockController],
  providers: [StockService],
  exports: [StockService],
})
export class StockModule {}
