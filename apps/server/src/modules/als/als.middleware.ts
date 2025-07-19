import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from 'nestjs-prisma';
import { v4 as uuidv4 } from 'uuid';

import { AuthService } from 'modules/auth/auth.service';

import { ALSService } from './als.service';

@Injectable()
export class ALSMiddleware implements NestMiddleware {
  constructor(
    private readonly als: ALSService,
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    let requestId = req.headers['x-request-id'];

    if (!requestId?.length) {
      requestId = uuidv4();
      req.headers['x-request-id'] = requestId;
    }

    // Use better-auth instead of SuperTokens
    const sessionResult = await this.authService.getSession(
      req.headers as unknown as HeadersInit,
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const store: Map<string, any> = new Map();

    store.set('opName', req.baseUrl);
    store.set('ipAddress', req.headers['x-forwarded-for']);
    store.set('requestId', requestId);

    if (sessionResult.session && sessionResult.user) {
      store.set('actorId', sessionResult.user.id);
      // Get workspace for the user
      const workspace = await this.prisma.workspace.findFirst({
        where: {
          userId: sessionResult.user.id,
        },
      });

      if (workspace) {
        store.set('workspaceId', workspace.id);
      }
    }

    this.als.run(store, () => {
      next();
    });

    res.header('x-request-id', requestId);
  }
}
