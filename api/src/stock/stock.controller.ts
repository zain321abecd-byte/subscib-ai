import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { AdminGuard } from "../auth/admin.guard";
import { StockService } from "./stock.service";

@Controller("stock")
@UseGuards(AdminGuard)
export class StockController {
  constructor(private readonly stock: StockService) {}

  @Get()
  async list() {
    return { ok: true, items: await this.stock.list() };
  }

  @Get("expiring-soon")
  async expiringSoon() {
    return { ok: true, items: await this.stock.expiringSoon() };
  }

  @Get(":id")
  async getOne(@Param("id") id: string) {
    return { ok: true, item: await this.stock.getOne(id) };
  }

  @Post()
  async create(@Body() body: any) {
    return { ok: true, item: await this.stock.create(body) };
  }

  @Patch(":id")
  async update(@Param("id") id: string, @Body() body: any) {
    return { ok: true, item: await this.stock.update(id, body) };
  }

  @Delete(":id")
  async remove(@Param("id") id: string) {
    return this.stock.remove(id);
  }

  @Post(":id/renew")
  async renew(@Param("id") id: string, @Body() body: any) {
    return { ok: true, item: await this.stock.renew(id, body) };
  }
}
