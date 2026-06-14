import { Module } from "@nestjs/common";
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

@Module({
  controllers: [
    ProductsAdminController,
    BlogAdminController,
    ReviewsAdminController,
    SettingsAdminController,
  ],
  providers: [ProductsService, BlogService, ReviewsService, SettingsService],
})
export class ContentModule {}
