import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import {
  BlogAdminController,
  ProductsAdminController,
  ReviewsAdminController,
  SettingsAdminController,
} from "./content.controller";
import { ProductsService } from "./products.service";
import { BlogService } from "./blog.service";
import { ReviewsService } from "./reviews.service";
import { SettingsService } from "./settings.service";

// AuthModule needed for AdminGuard on the admin routes in these controllers.
@Module({
  imports: [AuthModule],
  controllers: [
    ProductsAdminController,
    BlogAdminController,
    ReviewsAdminController,
    SettingsAdminController,
  ],
  providers: [ProductsService, BlogService, ReviewsService, SettingsService],
})
export class ContentModule {}
