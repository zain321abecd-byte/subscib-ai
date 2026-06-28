import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
  forwardRef,
} from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import * as crypto from "node:crypto";
import * as jwt from "jsonwebtoken";
import { EmailService } from "../notifications/email.service";
import { UsersRepo, type UserRow } from "./users.repo";
import type { AuthUser } from "./auth.types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BCRYPT_ROUNDS = 12;

export interface JwtPayload {
  sub: string;       // user id
  email: string;
  role: "superadmin" | "admin" | "manager" | "editor" | "customer";
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    private readonly users: UsersRepo,
    @Inject(forwardRef(() => EmailService)) private readonly email: EmailService,
  ) {}

  private secret(): string {
    const s = process.env.JWT_SECRET;
    if (!s || s.length < 32) {
      throw new Error("JWT_SECRET is missing or too short. Set a 32+ char value.");
    }
    return s;
  }

  private signJwt(user: UserRow): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    const ttl = process.env.JWT_ACCESS_TTL || "7d";
    return jwt.sign(payload, this.secret(), { expiresIn: ttl as jwt.SignOptions["expiresIn"] });
  }

  verifyJwt(token: string): JwtPayload {
    try {
      return jwt.verify(token, this.secret()) as JwtPayload;
    } catch {
      throw new UnauthorizedException("Invalid or expired token");
    }
  }

  /** Public shape returned to the frontend — never includes the password hash. */
  private publicUser(row: UserRow): AuthUser & { effectivePermissions: string[] } {
    // Lazy-loaded to avoid a circular import path in the constructor graph.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { parseOverride, resolveEffectivePermissions } = require("./permissions") as typeof import("./permissions");
    const override = parseOverride(row.permissions);
    const effective = Array.from(resolveEffectivePermissions(row.role, override));
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role,
      email_verified_at: row.email_verified_at,
      effectivePermissions: effective,
    };
  }

  // ── Signup ─────────────────────────────────────────────────────────────────
  async signup(input: { email: string; password: string; name?: string; phone?: string }) {
    const email = (input.email || "").trim().toLowerCase();
    const password = String(input.password || "");
    const name = (input.name || "").trim().slice(0, 160) || null;
    const phone = (input.phone || "").trim().slice(0, 40) || null;

    if (!EMAIL_RE.test(email)) throw new BadRequestException("Valid email is required.");
    if (password.length < 8) throw new BadRequestException("Password must be at least 8 characters.");

    const existing = await this.users.findByEmail(email);
    if (existing) throw new ConflictException("An account with that email already exists.");

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const verificationToken = crypto.randomBytes(32).toString("hex");

    const user = await this.users.create({ email, passwordHash, name, phone, verificationToken });
    if (!user) throw new BadRequestException("Could not create user.");

    // Fire-and-forget the verification email so signup doesn't 500 if SMTP is
    // momentarily flaky. EmailService logs the failure if any.
    this.email.sendVerificationEmail({ to: user.email, name: user.name, token: verificationToken })
      .catch((err) => this.logger.error(`verification email failed for ${user.email}: ${(err as Error).message}`));

    return {
      ok: true,
      message: "Account created. Check your email to verify your address before signing in.",
      user: this.publicUser(user),
    };
  }

  // ── Verify ─────────────────────────────────────────────────────────────────
  async verify(token: string) {
    if (!token || token.length < 16) throw new BadRequestException("Verification token is required.");
    const user = await this.users.findByVerificationToken(token);
    if (!user) throw new BadRequestException("Verification link is invalid or has already been used.");

    if (user.email_verified_at) {
      return { ok: true, alreadyVerified: true, email: user.email };
    }

    const updated = await this.users.markVerified(user.id);
    if (!updated) throw new BadRequestException("Could not verify email.");

    return { ok: true, alreadyVerified: false, email: updated.email };
  }

  // ── Login ──────────────────────────────────────────────────────────────────
  async login(input: { email: string; password: string }) {
    const email = (input.email || "").trim().toLowerCase();
    const password = String(input.password || "");

    if (!EMAIL_RE.test(email) || !password) {
      throw new UnauthorizedException("Invalid email or password.");
    }

    const user = await this.users.findByEmail(email);
    // Constant-time-ish: always run bcrypt.compare so timing doesn't leak
    // whether the email exists.
    const hashToCompare = user?.password_hash || "$2a$12$invalidsaltinvalidsaltinvalidsaltinvalidsalti";
    const ok = await bcrypt.compare(password, hashToCompare);
    if (!user || !ok) throw new UnauthorizedException("Invalid email or password.");

    if (!user.email_verified_at) {
      throw new UnauthorizedException("Please verify your email before signing in. Check your inbox for the verification link.");
    }

    await this.users.touchLastLogin(user.id);
    const accessToken = this.signJwt(user);
    return {
      ok: true,
      accessToken,
      user: this.publicUser(user),
    };
  }

  // ── Me ─────────────────────────────────────────────────────────────────────
  async me(userId: string) {
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException("User not found.");
    return { user: this.publicUser(user) };
  }
}
