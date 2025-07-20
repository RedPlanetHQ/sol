import { SetMetadata, createParamDecorator } from '@nestjs/common';
import type { CustomDecorator, ExecutionContext } from '@nestjs/common';
import { AFTER_HOOK_KEY, BEFORE_HOOK_KEY, HOOK_KEY } from './symbols';

/**
 * Marks a route or a controller as public, allowing unauthenticated access.
 * When applied, the AuthGuard will skip authentication checks.
 */
export const Public = (): CustomDecorator<string> =>
  SetMetadata('PUBLIC', true);

/**
 * Marks a route or a controller as having optional authentication.
 * When applied, the AuthGuard will allow the request to proceed
 * even if no session is present.
 */
export const Optional = (): CustomDecorator<string> =>
  SetMetadata('OPTIONAL', true);

/**
 * Parameter decorator that extracts the user session from the request.
 * Provides easy access to the authenticated user's session data in controller methods.
 */
export const Session: ParameterDecorator = createParamDecorator(
  (_data: unknown, context: ExecutionContext): unknown => {
    const request = context.switchToHttp().getRequest();
    return request.session;
  },
);

/**
 * Registers a method to be executed before a specific auth route is processed.
 * @param path - The auth route path that triggers this hook (must start with '/')
 */
export const BeforeHook = (path: `/${string}`): ClassDecorator =>
  SetMetadata(BEFORE_HOOK_KEY, path);

/**
 * Registers a method to be executed after a specific auth route is processed.
 * @param path - The auth route path that triggers this hook (must start with '/')
 */
export const AfterHook = (path: `/${string}`): ClassDecorator =>
  SetMetadata(AFTER_HOOK_KEY, path);

/**
 * Class decorator that marks a provider as containing hook methods.
 * Must be applied to classes that use BeforeHook or AfterHook decorators.
 */
export const Hook = (): ClassDecorator => SetMetadata(HOOK_KEY, true);
