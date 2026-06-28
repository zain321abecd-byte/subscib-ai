import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { UsersAdminController } from "./users-admin.controller";

// All admin user-management endpoints. Imports AuthModule so the
// PermissionGuard / AuthGuard / UsersRepo constructor deps resolve here.
@Module({
  imports: [AuthModule],
  controllers: [UsersAdminController],
})
export class UsersAdminModule {}
