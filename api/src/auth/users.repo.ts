import { Injectable, Logger } from "@nestjs/common";
import { SupabaseService } from "../supabase/supabase.service";

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  name: string | null;
  phone: string | null;
  role: "customer" | "admin";
  email_verified_at: string | null;
  verification_token: string | null;
  verification_sent_at: string | null;
  password_reset_token: string | null;
  password_reset_expires: string | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Thin DB wrapper around public.users. Uses the service-role client (bypasses
 * RLS) — all access control lives in the AuthGuard/AdminGuard above this.
 */
@Injectable()
export class UsersRepo {
  private readonly logger = new Logger(UsersRepo.name);
  constructor(private readonly supabase: SupabaseService) {}

  private table() {
    return this.supabase.admin().from("users");
  }

  async findByEmail(email: string): Promise<UserRow | null> {
    const { data, error } = await this.table()
      .select("*")
      .eq("email", email.trim().toLowerCase())
      .maybeSingle();
    if (error) {
      this.logger.error(`findByEmail(${email}) failed: ${error.message}`);
      return null;
    }
    return (data as UserRow | null) ?? null;
  }

  async findById(id: string): Promise<UserRow | null> {
    const { data, error } = await this.table().select("*").eq("id", id).maybeSingle();
    if (error) {
      this.logger.error(`findById(${id}) failed: ${error.message}`);
      return null;
    }
    return (data as UserRow | null) ?? null;
  }

  async findByVerificationToken(token: string): Promise<UserRow | null> {
    const { data, error } = await this.table()
      .select("*")
      .eq("verification_token", token)
      .maybeSingle();
    if (error) {
      this.logger.error(`findByVerificationToken failed: ${error.message}`);
      return null;
    }
    return (data as UserRow | null) ?? null;
  }

  async create(input: {
    email: string;
    passwordHash: string;
    name?: string | null;
    phone?: string | null;
    verificationToken: string;
  }): Promise<UserRow | null> {
    const { data, error } = await this.table()
      .insert({
        email: input.email.trim().toLowerCase(),
        password_hash: input.passwordHash,
        name: input.name ?? null,
        phone: input.phone ?? null,
        role: "customer",
        verification_token: input.verificationToken,
        verification_sent_at: new Date().toISOString(),
      })
      .select("*")
      .single();
    if (error) {
      this.logger.error(`create user(${input.email}) failed: ${error.message}`);
      return null;
    }
    return data as UserRow;
  }

  /** Mark email as verified, clear the verification token. */
  async markVerified(userId: string): Promise<UserRow | null> {
    const { data, error } = await this.table()
      .update({
        email_verified_at: new Date().toISOString(),
        verification_token: null,
      })
      .eq("id", userId)
      .select("*")
      .single();
    if (error) {
      this.logger.error(`markVerified(${userId}) failed: ${error.message}`);
      return null;
    }
    return data as UserRow;
  }

  async touchLastLogin(userId: string): Promise<void> {
    await this.table().update({ last_login_at: new Date().toISOString() }).eq("id", userId);
  }
}
