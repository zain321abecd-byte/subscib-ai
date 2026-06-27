import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { AuthedRequest, AuthUser } from "./auth.types";

/**
 * Injects the authenticated user (our public.users row, projected to AuthUser)
 * into a handler param. Only meaningful on routes protected by AuthGuard or
 * AdminGuard.
 *
 *   @Get("me")
 *   me(@CurrentUser() user: AuthUser) { ... }
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser | undefined => {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    return req.user;
  },
);

/** Injects the raw JWT (e.g. to forward to a downstream service). */
export const AccessToken = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    return req.accessToken;
  },
);
