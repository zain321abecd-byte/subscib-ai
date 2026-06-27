import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { UploadsController } from "./uploads.controller";
import { UploadsService } from "./uploads.service";

// AuthModule is imported so AdminGuard's constructor deps (AuthService,
// UsersRepo) resolve inside this module's injection scope.
@Module({
  imports: [AuthModule],
  controllers: [UploadsController],
  providers: [UploadsService],
})
export class UploadsModule {}
