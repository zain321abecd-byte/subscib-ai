import { Body, Controller, Delete, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { AdminGuard } from "../auth/admin.guard";
import { RequirePermission } from "../auth/permission.guard";
import { ProductsService } from "./products.service";
import { BlogService } from "./blog.service";
import { ReviewsService } from "./reviews.service";
import { SettingsService } from "./settings.service";

@Controller("admin/products")
@UseGuards(AdminGuard)
export class ProductsAdminController {
  constructor(private readonly products: ProductsService) {}

  @Post()
  @RequirePermission("products:write")
  create(@Body() body: any) {
    return this.products.create(body);
  }

  @Patch(":id")
  @RequirePermission("products:write")
  update(@Param("id") id: string, @Body() body: any) {
    return this.products.update(id, body);
  }

  @Delete(":id")
  @RequirePermission("products:delete")
  remove(@Param("id") id: string) {
    return this.products.remove(id);
  }
}

@Controller("admin/blog")
@UseGuards(AdminGuard)
export class BlogAdminController {
  constructor(private readonly blog: BlogService) {}

  @Post()
  @RequirePermission("blog:write")
  create(@Body() body: any) {
    return this.blog.create(body);
  }

  @Patch(":slug")
  @RequirePermission("blog:write")
  update(@Param("slug") slug: string, @Body() body: any) {
    return this.blog.update(slug, body);
  }

  @Delete(":slug")
  @RequirePermission("blog:delete")
  remove(@Param("slug") slug: string) {
    return this.blog.remove(slug);
  }
}

@Controller("admin/reviews")
@UseGuards(AdminGuard)
export class ReviewsAdminController {
  constructor(private readonly reviews: ReviewsService) {}

  @Post()
  @RequirePermission("reviews:moderate")
  create(@Body() body: any) {
    return this.reviews.create(body);
  }

  @Patch(":id")
  @RequirePermission("reviews:moderate")
  update(@Param("id") id: string, @Body() body: any) {
    return this.reviews.update(id, body);
  }

  @Delete(":id")
  @RequirePermission("reviews:delete")
  remove(@Param("id") id: string) {
    return this.reviews.remove(id);
  }
}

@Controller("admin/settings")
@UseGuards(AdminGuard)
export class SettingsAdminController {
  constructor(private readonly settings: SettingsService) {}

  @Post()
  @RequirePermission("settings:write")
  save(@Body() body: any) {
    return this.settings.save(body);
  }
}
