import type { Request } from "express";

/**
 * The authenticated user our backend attaches to requests after the
 * JwtAuthGuard runs. This is OUR public.users row, not a Supabase auth user.
 */
export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: "superadmin" | "admin" | "manager" | "editor" | "customer";
  email_verified_at: string | null;
}

/**
 * Request augmented by the auth guards. After AuthGuard / AdminGuard runs,
 * `user` is populated with the authenticated user. `accessToken` is the
 * raw JWT (kept for downstream services that need to forward it).
 */
export interface AuthedRequest extends Request {
  user?: AuthUser;
  accessToken?: string;
}

/** Pull the Bearer token out of the Authorization header, or null. */
export function extractBearerToken(req: Request): string | null {
  const header = req.headers["authorization"] || req.headers["Authorization" as keyof typeof req.headers];
  const value = Array.isArray(header) ? header[0] : header;
  if (!value) return null;
  const [scheme, token] = value.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token.trim();
}
