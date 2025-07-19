import type { AuthSession, AuthUser } from './auth.config';

import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Get the current user from the request
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

/**
 * Get the current session from the request
 */
export const Session = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthSession => {
    const request = ctx.switchToHttp().getRequest();
    return request.session;
  },
);

/**
 * Get the current user ID from the request
 */
export const UserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.id;
  },
);

/**
 * Get the current user email from the request
 */
export const CurrentUserEmail = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.email;
  },
);

/**
 * Get the current workspace ID from the request
 * This assumes workspace data is stored in user context or session
 */
export const Workspace = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    // You'll need to implement workspace resolution logic here
    // This could be from user.workspaceId or session data
    return request.user?.workspaceId || request.workspace?.id;
  },
);

/**
 * Get the current user ID for tracking updates
 */
export const UpdatedBy = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.id;
  },
);

/**
 * Get the user's role from the request
 */
export const UserRole = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    // You'll need to implement role resolution logic here
    return request.user?.role || 'user';
  },
);
