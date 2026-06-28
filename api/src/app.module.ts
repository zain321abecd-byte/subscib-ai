import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { validateEnv } from "./config/env.validation";
import { SupabaseModule } from "./supabase/supabase.module";
import { HealthModule } from "./health/health.module";
import { AuthModule } from "./auth/auth.module";
import { PaymentsModule } from "./payments/payments.module";
import { UploadsModule } from "./uploads/uploads.module";
import { StockModule } from "./stock/stock.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { OrdersModule } from "./orders/orders.module";
import { PublicModule } from "./public/public.module";
import { ContentModule } from "./content/content.module";
import { UsersAdminModule } from "./users-admin/users-admin.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env"],
      validate: validateEnv,
    }),
    ScheduleModule.forRoot(),
    SupabaseModule,
    HealthModule,
    AuthModule,
    // Phase 3 — integrations
    PaymentsModule,
    UploadsModule,
    NotificationsModule,
    // Phase 4 — stock, orders, public endpoints
    StockModule,
    OrdersModule,
    PublicModule,
    // Phase 5 — admin content writes
    ContentModule,
    // Phase 6 — admin user / role / permission management
    UsersAdminModule,
  ],
})
export class AppModule {}
