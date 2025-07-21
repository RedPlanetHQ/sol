import type { AuthSession, AuthUser } from './auth.config';

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { PrismaService } from 'nestjs-prisma';

import { AuthService } from './auth.service';

export interface ExtendedRequest extends ExpressRequest {
  user?: AuthUser & { workspaceId?: string };
  session?: AuthSession;
  workspace?: { id: string };
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<ExtendedRequest>();

    try {
      // First try Better Auth session authentication
      const sessionResult = await this.tryBetterAuthSession(request);
      if (sessionResult) {
        return true;
      }

      // If session auth fails, try API key authentication
      const apiKeyResult = await this.tryApiKeyAuthentication(request);
      if (apiKeyResult) {
        return true;
      }

      throw new UnauthorizedException('Authentication failed');
    } catch (error) {
      console.error('Authentication failed:', error);
      throw new UnauthorizedException('Authentication failed');
    }
  }

  private async tryBetterAuthSession(
    request: ExtendedRequest,
  ): Promise<boolean> {
    try {
      const auth = this.authService.getAuth();

      // Construct full URL from Express request
      const protocol = request.protocol || 'http';
      const host = request.get('host') || process.env.FRONTEND_HOST;
      const fullUrl = `${protocol}://${host}${request.url}`;

      // Convert Express request to Web API request format for validation
      const webRequest = new Request(fullUrl, {
        method: request.method,
        headers: request.headers as HeadersInit,
      });

      const result = await auth.api.getSession({
        headers: webRequest.headers,
      });

      if (!result.session || !result.user) {
        return false;
      }

      // Attach user and session to request for use in controllers
      request.user = result.user;
      request.session = result.session;

      await this.attachWorkspace(request, result.user.id);
      return true;
    } catch (error) {
      return false;
    }
  }

  private async tryApiKeyAuthentication(
    request: ExtendedRequest,
  ): Promise<boolean> {
    try {
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return false;
      }

      const token = authHeader.replace('Bearer ', '');

      const auth = this.authService.getAuth();
      const result = await auth.api.verifyApiKey({
        body: { key: token },
      });

      if (!result.valid || !result.key) {
        return false;
      }

      const session = await auth.api.getSession({
        headers: new Headers({
          'x-api-key': token,
        }),
      });

      // Attach user to request (no session for API keys)
      request.user = session.user;
      request.session = session.session;

      await this.attachWorkspace(request, session.user.id);
      return true;
    } catch (error) {
      return false;
    }
  }

  private async attachWorkspace(
    request: ExtendedRequest,
    userId: string,
  ): Promise<void> {
    const workspace = await this.prisma.workspace.findFirst({
      where: {
        userId,
      },
    });

    if (workspace) {
      request.workspace = workspace;
      // Add workspace ID to user object for compatibility
      if (request.user) {
        request.user.workspaceId = workspace.id;
      }
    }
  }
}
