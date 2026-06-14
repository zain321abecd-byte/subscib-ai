import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { SupabaseService } from "../supabase/supabase.service";
import type { StockItemRow } from "./stock.types";
import {
  bodyToStockInput,
  normalizeStockItem,
  stockMutationStatus,
  toStockInsert,
  validateStockInput,
} from "./stock.util";

@Injectable()
export class StockService {
  constructor(private readonly supabase: SupabaseService) {}

  private db() {
    return this.supabase.admin();
  }

  async list() {
    const { data, error } = await this.db().from("stock_items").select("*").order("expiry_date", { ascending: true });
    if (error) throw new InternalServerErrorException(error.message);
    return ((data ?? []) as StockItemRow[]).map((row) => normalizeStockItem(row));
  }

  async expiringSoon() {
    const items = await this.list();
    return items.filter((item) => item.computed_status === "expiringSoon");
  }

  async getOne(id: string) {
    const { data, error } = await this.db().from("stock_items").select("*").eq("id", id).maybeSingle();
    if (error) throw new InternalServerErrorException(error.message);
    if (!data) throw new NotFoundException("Stock item not found");
    return normalizeStockItem(data as StockItemRow);
  }

  async create(body: any) {
    const input = bodyToStockInput(body);
    const validationError = validateStockInput(input);
    if (validationError) throw new BadRequestException(validationError);

    const { data, error } = await this.db().from("stock_items").insert(toStockInsert(input)).select("*").single();
    if (error) throw new InternalServerErrorException(error.message);
    return normalizeStockItem(data as StockItemRow);
  }

  async update(id: string, body: any) {
    const { data: existing, error: readError } = await this.db().from("stock_items").select("*").eq("id", id).maybeSingle();
    if (readError) throw new InternalServerErrorException(readError.message);
    if (!existing) throw new NotFoundException("Stock item not found");

    const input = bodyToStockInput(body, existing as StockItemRow);
    const validationError = validateStockInput(input);
    if (validationError) throw new BadRequestException(validationError);

    const { data, error } = await this.db().from("stock_items").update(toStockInsert(input)).eq("id", id).select("*").single();
    if (error) throw new InternalServerErrorException(error.message);
    return normalizeStockItem(data as StockItemRow);
  }

  async remove(id: string) {
    const { error } = await this.db().from("stock_items").delete().eq("id", id);
    if (error) throw new InternalServerErrorException(error.message);
    return { ok: true };
  }

  async renew(id: string, body: any) {
    const expiryDate = String(body?.expiryDate ?? body?.expiry_date ?? "").trim();
    const quantity = body?.quantity === undefined || body?.quantity === "" ? null : Number(body.quantity);
    const reminderDaysBeforeExpiry = Number(body?.reminderDaysBeforeExpiry ?? body?.reminder_days_before_expiry ?? 7);

    if (!expiryDate) throw new BadRequestException("New expiry date is required.");
    if (quantity !== null && (!Number.isFinite(quantity) || quantity <= 0)) {
      throw new BadRequestException("Quantity must be a positive number.");
    }

    const reminder = Number.isFinite(reminderDaysBeforeExpiry) ? Math.max(0, Math.floor(reminderDaysBeforeExpiry)) : 7;
    const patch: Record<string, unknown> = {
      expiry_date: expiryDate,
      reminder_days_before_expiry: reminder,
      status: stockMutationStatus(expiryDate, reminder),
      renewed_at: new Date().toISOString(),
      last_reminder_sent_at: null,
      last_expired_reminder_sent_at: null,
    };
    if (quantity !== null) patch.quantity = quantity;

    const { data, error } = await this.db().from("stock_items").update(patch).eq("id", id).select("*").single();
    if (error) throw new InternalServerErrorException(error.message);
    return normalizeStockItem(data as StockItemRow);
  }
}
