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

interface ExtendedRequest extends ExpressRequest {
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

      // If session auth fails, try PAT authentication
      const patResult = await this.tryPATAuthentication(request);
      if (patResult) {
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

      // Convert Express request to Web API request format for validation
      const webRequest = new Request(request.url || '', {
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

  private async tryPATAuthentication(
    request: ExtendedRequest,
  ): Promise<boolean> {
    try {
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return false;
      }

      const token = authHeader.replace('Bearer ', '');

      // Validate PAT token against database
      const personalAccessToken =
        await this.prisma.personalAccessToken.findFirst({
          where: {
            token,
          },
          include: {
            user: true,
          },
        });

      if (!personalAccessToken || !personalAccessToken.user) {
        return false;
      }

      // Create a user object compatible with Better Auth format
      const user: AuthUser = {
        id: personalAccessToken.user.id,
        email: personalAccessToken.user.email,
        name:
          personalAccessToken.user.name ||
          personalAccessToken.user.fullname ||
          'User',
        image: personalAccessToken.user.image,
        emailVerified: personalAccessToken.user.emailVerified,
        createdAt: personalAccessToken.user.createdAt,
        updatedAt: personalAccessToken.user.updatedAt,
      };

      // Attach user to request (no session for PAT)
      request.user = user;
      request.session = undefined; // PATs don't have sessions

      await this.attachWorkspace(request, user.id);
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
