import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthGuard } from "./auth.guard";
import { AdminGuard } from "./admin.guard";

/**
 * Provides the auth guards for the whole app. SupabaseService is available
 * globally (SupabaseModule is @Global), so guards can inject it anywhere they
 * are used via @UseGuards(AuthGuard) / @UseGuards(AdminGuard).
 */
@Module({
  controllers: [AuthController],
  providers: [AuthGuard, AdminGuard],
  exports: [AuthGuard, AdminGuard],
})
export class AuthModule {}
