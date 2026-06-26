import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { AdminGuard } from "../auth/admin.guard";
import { SupabaseService } from "../supabase/supabase.service";
import { EmailService } from "./email.service";

function isEmail(value: unknown): value is string {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function parseEmails(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter(isEmail).map((e) => e.trim().toLowerCase());
  if (typeof value !== "string") return [];
  return value.split(/[\s,;]+/).filter(isEmail).map((e) => e.trim().toLowerCase());
}

@Controller("emails")
export class EmailController {
  constructor(
    private readonly email: EmailService,
    private readonly supabase: SupabaseService,
  ) {}

  @Get("status")
  @UseGuards(AdminGuard)
  status() {
    return this.email.status();
  }

  @Post("subscribe")
  async subscribe(@Body() body: any) {
    if (!isEmail(body?.email)) return { ok: false, error: "Valid email is required." };
    const email = body.email.trim().toLowerCase();
    const name = typeof body.name === "string" ? body.name.trim().slice(0, 160) : null;
    const phone = typeof body.phone === "string" ? body.phone.trim().slice(0, 80) : null;
    const source = typeof body.source === "string" ? body.source.trim().slice(0, 80) : "newsletter";

    await this.supabase.admin().from("email_subscribers").upsert({
      email,
      name,
      phone,
      source,
      subscribed: true,
      unsubscribed_at: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "email" });

    try {
      await this.email.sendWelcomeEmail({ to: email, name });
    } catch {}

    return { ok: true };
  }

  @Get("unsubscribe")
  async unsubscribe(@Query("email") email: string) {
    if (!isEmail(email)) return { ok: false, error: "Valid email is required." };
    const normalized = email.trim().toLowerCase();
    await this.supabase.admin().from("email_subscribers").update({
      subscribed: false,
      unsubscribed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("email", normalized);
    return { ok: true, message: "You have been unsubscribed." };
  }

  @Post("promotions/test")
  @UseGuards(AdminGuard)
  async sendTest(@Body() body: any) {
    if (!isEmail(body?.to)) return { ok: false, error: "Valid test email is required." };
    await this.email.sendPromotionEmail({
      to: body.to.trim().toLowerCase(),
      subject: String(body.subject || "SubscribAI update").slice(0, 180),
      messageHtml: String(body.messageHtml || ""),
      messageText: typeof body.messageText === "string" ? body.messageText : undefined,
    });
    return { ok: true };
  }

  @Post("promotions")
  @UseGuards(AdminGuard)
  async sendPromotion(@Body() body: any) {
    let recipients = parseEmails(body?.recipients);
    if (body?.source === "subscribers") {
      const { data } = await this.supabase.admin().from("email_subscribers").select("email").eq("subscribed", true);
      recipients = (data ?? []).map((row) => row.email);
    }
    if (body?.source === "customers") {
      const { data } = await this.supabase.admin().from("orders").select("customer_email");
      recipients = [...new Set((data ?? []).map((row) => row.customer_email).filter(Boolean))];
    }

    return this.email.sendBulkPromotionEmail({
      recipients,
      subject: String(body.subject || "SubscribAI update").slice(0, 180),
      messageHtml: String(body.messageHtml || ""),
      messageText: typeof body.messageText === "string" ? body.messageText : undefined,
    });
  }
}
