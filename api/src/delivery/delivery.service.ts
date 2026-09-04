import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { SupabaseService } from "../supabase/supabase.service";
import { EmailService } from "../notifications/email.service";
import { WhatsappService } from "./whatsapp.service";
import {
  MESSAGE_KINDS,
  type DeliveryMessageRow,
  type DeliveryVariables,
  type MessageChannel,
  type MessageKind,
  type MessageTemplateRow,
  type SendDeliveryInput,
} from "./delivery.types";
import {
  TEMPLATE_VARIABLES,
  dedupeHash,
  formatDate,
  isE164,
  normalizePhone,
  renderTemplate,
  waLink,
} from "./template.util";

/** How long after an identical message we treat a second send as a duplicate. */
const DEFAULT_DUPLICATE_WINDOW_MINUTES = 10;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function str(value: unknown, max = 2000): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  return s ? s.slice(0, max) : null;
}

@Injectable()
export class DeliveryService {
  private readonly logger = new Logger(DeliveryService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly whatsapp: WhatsappService,
    private readonly email: EmailService,
  ) {}

  // ── config / status ─────────────────────────────────────────────────────

  status() {
    return {
      whatsapp: this.whatsapp.status(),
      email: this.email.status(),
      variables: TEMPLATE_VARIABLES,
      duplicateWindowMinutes: this.duplicateWindowMinutes(),
      reminderDaysBefore: this.reminderDaysBefore(),
    };
  }

  private duplicateWindowMinutes(): number {
    const raw = Number(process.env.DELIVERY_DUPLICATE_WINDOW_MINUTES);
    return Number.isFinite(raw) && raw >= 0 ? raw : DEFAULT_DUPLICATE_WINDOW_MINUTES;
  }

  private reminderDaysBefore(): number {
    const raw = Number(process.env.DELIVERY_REMINDER_DAYS_BEFORE);
    return Number.isFinite(raw) && raw >= 0 ? Math.floor(raw) : 3;
  }

  /**
   * Business identity pulled from site_settings (same keys the emails use).
   * Degrades to env / defaults if the settings row can't be read — these three
   * values only fill in the support footer, so a preview shouldn't fail over it.
   */
  private async brand(): Promise<{ supportEmail: string; supportWhatsapp: string; brandName: string }> {
    const map = new Map<string, string>();
    try {
      const { data } = await this.supabase
        .admin()
        .from("site_settings")
        .select("key,value")
        .in("key", ["contact_email", "whatsapp_number", "business_name"]);
      for (const row of data ?? []) {
        const value = typeof row.value === "string" ? row.value : String(row.value ?? "");
        map.set(row.key, value.replace(/^"|"$/g, ""));
      }
    } catch (err) {
      this.logger.warn(`Could not read site_settings for the message footer: ${(err as Error).message}`);
    }
    return {
      supportEmail: map.get("contact_email") || process.env.EMAIL_REPLY_TO || "",
      supportWhatsapp: map.get("whatsapp_number") || process.env.WHATSAPP_BUSINESS_NUMBER || "",
      brandName: map.get("business_name") || "SubscribAI",
    };
  }

  // ── templates ──────────────────────────────────────────────────────────

  async listTemplates(filter: {
    kind?: string;
    language?: string;
    productId?: string;
    includeInactive?: boolean;
  } = {}): Promise<MessageTemplateRow[]> {
    let query = this.supabase.admin().from("message_templates").select("*");
    if (filter.kind) query = query.eq("kind", filter.kind);
    if (filter.language) query = query.eq("language", filter.language);
    if (filter.productId) query = query.eq("product_id", filter.productId);
    if (!filter.includeInactive) query = query.eq("active", true);

    const { data, error } = await query
      .order("kind", { ascending: true })
      .order("is_default", { ascending: false })
      .order("name", { ascending: true });
    if (error) throw new BadRequestException(error.message);
    return (data ?? []) as MessageTemplateRow[];
  }

  async getTemplate(id: string): Promise<MessageTemplateRow> {
    const { data, error } = await this.supabase
      .admin()
      .from("message_templates")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException("Template not found.");
    return data as MessageTemplateRow;
  }

  async createTemplate(input: Partial<MessageTemplateRow> & { actorId?: string | null }): Promise<MessageTemplateRow> {
    const row = this.templatePayload(input);
    if (!row.name) throw new BadRequestException("Template name is required.");
    if (!row.body) throw new BadRequestException("Template body is required.");

    const { data, error } = await this.supabase
      .admin()
      .from("message_templates")
      .insert({ ...row, created_by: input.actorId || null })
      .select("*")
      .single();
    if (error) throw new BadRequestException(error.message);

    const created = data as MessageTemplateRow;
    if (created.is_default) await this.clearOtherDefaults(created);
    return created;
  }

  async updateTemplate(id: string, input: Partial<MessageTemplateRow>): Promise<MessageTemplateRow> {
    const patch = this.templatePayload(input, true);
    if (Object.keys(patch).length === 0) throw new BadRequestException("Nothing to update.");

    const { data, error } = await this.supabase
      .admin()
      .from("message_templates")
      .update(patch)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException("Template not found.");

    const updated = data as MessageTemplateRow;
    if (updated.is_default) await this.clearOtherDefaults(updated);
    return updated;
  }

  async deleteTemplate(id: string): Promise<{ ok: true }> {
    const { error } = await this.supabase.admin().from("message_templates").delete().eq("id", id);
    if (error) throw new BadRequestException(error.message);
    return { ok: true };
  }

  /** Only one default per (kind, language, product) — demote the rest. */
  private async clearOtherDefaults(template: MessageTemplateRow): Promise<void> {
    let query = this.supabase
      .admin()
      .from("message_templates")
      .update({ is_default: false })
      .eq("kind", template.kind)
      .eq("language", template.language)
      .neq("id", template.id);
    query = template.product_id ? query.eq("product_id", template.product_id) : query.is("product_id", null);
    const { error } = await query;
    if (error) this.logger.warn(`Could not demote sibling default templates: ${error.message}`);
  }

  private templatePayload(
    input: Partial<MessageTemplateRow>,
    partial = false,
  ): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    const set = (key: string, value: unknown) => {
      if (!partial || value !== undefined) out[key] = value;
    };

    if (input.name !== undefined || !partial) set("name", str(input.name, 160) ?? "");
    if (input.body !== undefined || !partial) set("body", str(input.body, 8000) ?? "");
    if (input.kind !== undefined || !partial) {
      const kind = (input.kind || "delivery") as MessageKind;
      if (!MESSAGE_KINDS.includes(kind)) throw new BadRequestException(`Unknown template kind: ${input.kind}`);
      set("kind", kind);
    }
    if (input.language !== undefined || !partial) {
      set("language", (str(input.language, 8) || "en").toLowerCase());
    }
    if (input.product_id !== undefined || !partial) set("product_id", str(input.product_id, 120));
    if (input.active !== undefined || !partial) set("active", input.active === undefined ? true : !!input.active);
    if (input.is_default !== undefined || !partial) set("is_default", !!input.is_default);
    return out;
  }

  /**
   * Pick the template the composer / cron should use: a product-specific
   * default beats a generic default, which beats any active template for the
   * requested (kind, language). Falls back to English when the requested
   * language has nothing.
   */
  async pickTemplate(args: { kind: MessageKind; language?: string; productId?: string | null }): Promise<MessageTemplateRow | null> {
    const language = (args.language || "en").toLowerCase();
    const candidates = await this.listTemplates({ kind: args.kind });

    const score = (t: MessageTemplateRow): number => {
      let s = 0;
      if (args.productId && t.product_id === args.productId) s += 8;
      else if (t.product_id) s -= 8;                       // other product's template
      if (t.language === language) s += 4;
      else if (t.language === "en") s += 1;
      if (t.is_default) s += 2;
      return s;
    };

    const usable = candidates.filter((t) => !t.product_id || !args.productId || t.product_id === args.productId);
    if (usable.length === 0) return null;
    return usable.sort((a, b) => score(b) - score(a))[0];
  }

  // ── rendering ──────────────────────────────────────────────────────────

  /** Fill the auto variables and normalise the date fields for display. */
  private async resolveVariables(vars: DeliveryVariables, productName?: string | null): Promise<DeliveryVariables> {
    const brand = await this.brand();
    return {
      ...vars,
      subscription_name: vars.subscription_name || productName || null,
      start_date: vars.start_date ? formatDate(vars.start_date) : null,
      renewal_date: vars.renewal_date ? formatDate(vars.renewal_date) : null,
      expiry_date: vars.expiry_date ? formatDate(vars.expiry_date) : null,
      support_email: vars.support_email || brand.supportEmail || null,
      support_whatsapp: vars.support_whatsapp || brand.supportWhatsapp || null,
      brand_name: vars.brand_name || brand.brandName,
    };
  }

  /**
   * Render the message the customer would receive, without sending anything.
   * Powers the "Preview message" button.
   */
  async preview(input: {
    templateId?: string | null;
    bodyOverride?: string | null;
    kind?: MessageKind;
    language?: string;
    productId?: string | null;
    productName?: string | null;
    variables?: DeliveryVariables;
    customerPhone?: string | null;
  }) {
    const kind = (input.kind || "delivery") as MessageKind;
    let template: MessageTemplateRow | null = null;
    if (input.templateId) template = await this.getTemplate(input.templateId);
    else if (!input.bodyOverride) {
      template = await this.pickTemplate({ kind, language: input.language, productId: input.productId });
    }

    const body = input.bodyOverride?.trim() || template?.body || "";
    if (!body) throw new BadRequestException("No template selected and no message body provided.");

    const vars = await this.resolveVariables(input.variables ?? {}, input.productName);
    const rendered = renderTemplate(body, vars);
    const phone = normalizePhone(input.customerPhone);

    return {
      body: rendered.text,
      missing: rendered.missing,
      unknown: rendered.unknown,
      templateId: template?.id ?? null,
      templateName: template?.name ?? null,
      language: template?.language ?? (input.language || "en"),
      phone,
      phoneValid: isE164(phone),
      manualLink: phone ? waLink(phone, rendered.text) : null,
    };
  }

  // ── sending ────────────────────────────────────────────────────────────

  /**
   * Render + send a delivery message, then log the outcome.
   *
   * Always resolves (never throws for a provider failure) so the admin sees
   * "failed — here's why, here's the wa.me fallback" rather than a 500. A bad
   * *request* (no phone, no template) still 400s.
   */
  async send(input: SendDeliveryInput) {
    const kind = (input.kind || "delivery") as MessageKind;
    if (!MESSAGE_KINDS.includes(kind)) throw new BadRequestException(`Unknown message kind: ${kind}`);

    const phone = normalizePhone(input.customerPhone);
    if (!phone) throw new BadRequestException("Enter a valid WhatsApp number (e.g. 03001234567 or +923001234567).");

    const productName = str(input.productName, 200) || str(input.variables?.subscription_name, 200);
    if (!productName) throw new BadRequestException("Select the subscription / product being delivered.");

    const preview = await this.preview({
      templateId: input.templateId,
      bodyOverride: input.bodyOverride,
      kind,
      language: input.language,
      productId: input.productId,
      productName,
      variables: input.variables,
      customerPhone: phone,
    });

    const hash = dedupeHash({ kind, phone, productId: input.productId, body: preview.body });

    // Duplicate guard — same message, same number, within the window.
    if (!input.force) {
      const duplicate = await this.findRecentDuplicate(hash);
      if (duplicate) {
        return {
          ok: false as const,
          duplicate: true as const,
          message:
            `The same message was already sent to ${phone} ` +
            `${new Date(duplicate.created_at).toLocaleString("en-GB")}. Confirm to send it again.`,
          log: duplicate,
        };
      }
    }

    const channel: MessageChannel = this.whatsapp.provider() === "manual" ? "manual" : "whatsapp";

    // Log first (status pending) so a crash mid-send still leaves a trace.
    const log = await this.insertLog({
      order_id: input.orderId || null,
      sale_id: input.saleId || null,
      template_id: preview.templateId,
      template_name: preview.templateName,
      kind,
      language: preview.language,
      customer_name: str(input.customerName, 160),
      customer_phone: phone,
      customer_email: str(input.customerEmail, 200),
      product_id: str(input.productId, 120),
      product_name: productName,
      channel,
      message_body: preview.body,
      status: "pending",
      dedupe_hash: hash,
      sent_by: input.actor?.id || null,
      sent_by_email: str(input.actor?.email, 200),
    });

    const result = await this.whatsapp.sendText({ to: phone, body: preview.body });

    const patch: Partial<DeliveryMessageRow> = result.ok
      ? { status: "sent", sent_at: new Date().toISOString(), provider: result.provider, provider_message_id: result.messageId ?? null, error: null }
      : channel === "manual"
        ? { status: "pending", provider: "manual", error: null }
        : { status: "failed", provider: result.provider, error: result.error?.slice(0, 500) || "Send failed." };

    const updated = await this.updateLog(log.id, patch);

    // Optional second channel: the same message by email.
    let emailLog: DeliveryMessageRow | null = null;
    if (input.alsoEmail && input.customerEmail) {
      emailLog = await this.sendByEmail({
        to: String(input.customerEmail),
        body: preview.body,
        productName,
        kind,
        language: preview.language,
        base: {
          order_id: input.orderId || null,
          sale_id: input.saleId || null,
          template_id: preview.templateId,
          template_name: preview.templateName,
          customer_name: str(input.customerName, 160),
          customer_phone: phone,
          product_id: str(input.productId, 120),
          sent_by: input.actor?.id || null,
          sent_by_email: str(input.actor?.email, 200),
        },
      });
    }

    return {
      ok: result.ok || channel === "manual",
      duplicate: false as const,
      status: updated.status,
      channel,
      provider: result.provider,
      manualLink: result.manualLink ?? preview.manualLink,
      error: result.ok ? null : result.error ?? null,
      body: preview.body,
      missing: preview.missing,
      unknown: preview.unknown,
      log: updated,
      emailLog,
    };
  }

  /** Re-send a logged message verbatim (same body, same number). */
  async resend(id: string, opts: { force?: boolean; actor?: { id?: string | null; email?: string | null } | null } = {}) {
    const original = await this.getMessage(id);
    return this.send({
      templateId: original.template_id,
      bodyOverride: original.message_body,
      kind: original.kind,
      language: original.language,
      productId: original.product_id,
      productName: original.product_name,
      customerPhone: original.customer_phone,
      customerName: original.customer_name,
      customerEmail: original.customer_email,
      orderId: original.order_id,
      saleId: original.sale_id,
      force: opts.force ?? true,
      actor: opts.actor ?? null,
    });
  }

  /** Mail the rendered message. Logged as its own `email` channel row. */
  private async sendByEmail(args: {
    to: string;
    body: string;
    productName: string;
    kind: MessageKind;
    language: string;
    base: Partial<DeliveryMessageRow>;
  }): Promise<DeliveryMessageRow> {
    const subject =
      args.kind === "delivery"
        ? `Your ${args.productName} subscription details`
        : args.kind === "renewal_reminder"
          ? `${args.productName} — renewal reminder`
          : `${args.productName} — subscription expired`;

    const log = await this.insertLog({
      ...args.base,
      kind: args.kind,
      language: args.language,
      product_name: args.productName,
      customer_email: args.to,
      channel: "email",
      provider: "smtp",
      message_body: args.body,
      status: "pending",
    } as Partial<DeliveryMessageRow>);

    try {
      await this.email.sendEmail({
        to: args.to,
        subject,
        text: args.body,
        html: `<div style="font-family:Arial,Helvetica,sans-serif;line-height:1.7;color:#111827;white-space:pre-wrap">${escapeHtml(args.body)}</div>`,
        emailType: "transactional",
        relatedOrderId: (args.base.order_id as string | null) ?? null,
      });
      return this.updateLog(log.id, { status: "sent", sent_at: new Date().toISOString(), error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Email send failed.";
      this.logger.error(`Delivery email to ${args.to} failed: ${message}`);
      return this.updateLog(log.id, { status: "failed", error: message.slice(0, 500) });
    }
  }

  // ── log ────────────────────────────────────────────────────────────────

  private async insertLog(row: Partial<DeliveryMessageRow>): Promise<DeliveryMessageRow> {
    const { data, error } = await this.supabase
      .admin()
      .from("delivery_messages")
      .insert(row)
      .select("*")
      .single();
    if (error) throw new BadRequestException(`Could not write the delivery log: ${error.message}`);
    return data as DeliveryMessageRow;
  }

  private async updateLog(id: string, patch: Partial<DeliveryMessageRow>): Promise<DeliveryMessageRow> {
    const { data, error } = await this.supabase
      .admin()
      .from("delivery_messages")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new BadRequestException(`Could not update the delivery log: ${error.message}`);
    return data as DeliveryMessageRow;
  }

  private async findRecentDuplicate(hash: string): Promise<DeliveryMessageRow | null> {
    const windowMinutes = this.duplicateWindowMinutes();
    if (windowMinutes === 0) return null;
    const since = new Date(Date.now() - windowMinutes * 60_000).toISOString();

    const { data, error } = await this.supabase
      .admin()
      .from("delivery_messages")
      .select("*")
      .eq("dedupe_hash", hash)
      .neq("status", "failed")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1);
    if (error) {
      this.logger.warn(`Duplicate check failed (allowing the send): ${error.message}`);
      return null;
    }
    return (data?.[0] as DeliveryMessageRow | undefined) ?? null;
  }

  async listMessages(filter: {
    limit?: number;
    status?: string;
    kind?: string;
    channel?: string;
    orderId?: string;
    saleId?: string;
    search?: string;
  } = {}): Promise<DeliveryMessageRow[]> {
    const limit = Math.min(Math.max(Number(filter.limit) || 200, 1), 500);
    let query = this.supabase.admin().from("delivery_messages").select("*");

    if (filter.status) query = query.eq("status", filter.status);
    if (filter.kind) query = query.eq("kind", filter.kind);
    if (filter.channel) query = query.eq("channel", filter.channel);
    if (filter.orderId) query = query.eq("order_id", filter.orderId);
    if (filter.saleId) query = query.eq("sale_id", filter.saleId);
    if (filter.search) {
      const q = filter.search.replace(/[%,()]/g, " ").trim();
      if (q) {
        query = query.or(
          [
            `customer_name.ilike.%${q}%`,
            `customer_phone.ilike.%${q}%`,
            `customer_email.ilike.%${q}%`,
            `product_name.ilike.%${q}%`,
          ].join(","),
        );
      }
    }

    const { data, error } = await query.order("created_at", { ascending: false }).limit(limit);
    if (error) throw new BadRequestException(error.message);
    return (data ?? []) as DeliveryMessageRow[];
  }

  async getMessage(id: string): Promise<DeliveryMessageRow> {
    const { data, error } = await this.supabase
      .admin()
      .from("delivery_messages")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException("Delivery message not found.");
    return data as DeliveryMessageRow;
  }

  /** Has this sale already been told about `kind`? Used by the cron sweep. */
  async hasMessageForSale(saleId: string, kind: MessageKind): Promise<boolean> {
    const { data, error } = await this.supabase
      .admin()
      .from("delivery_messages")
      .select("id")
      .eq("sale_id", saleId)
      .eq("kind", kind)
      .neq("status", "failed")
      .limit(1);
    if (error) {
      this.logger.warn(`hasMessageForSale failed: ${error.message}`);
      return false;
    }
    return (data?.length ?? 0) > 0;
  }
}
