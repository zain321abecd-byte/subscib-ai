import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { AuthedRequest } from "./auth.types";

/**
 * Injects the authenticated Supabase user into a handler param.
 * Only meaningful on routes protected by AuthGuard or AdminGuard.
 *
 *   @Get("me")
 *   me(@CurrentUser() user: User) { ... }
 */
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest<AuthedRequest>();
  return req.user;
});

/** Injects the caller's raw Supabase access token (for forUser() RLS calls). */
export const AccessToken = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest<AuthedRequest>();
  return req.accessToken;
});
