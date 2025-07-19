import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';

import { UsersService } from 'modules/users/users.service';
import { AuthService } from './auth.service';

@Injectable()
export class CreditsGuard implements CanActivate {
  constructor(private moduleRef: ModuleRef) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest();

    const usersService = await this.moduleRef.resolve(UsersService);
    const authService = await this.moduleRef.resolve(AuthService);

    try {
      const sessionResult = await authService.getSession(request.headers);

      if (!sessionResult?.user) {
        throw new BadRequestException('Authentication required');
      }

      const userId = sessionResult.user.id;
      const hasCredits = await usersService.hasAvailableCredits(userId);

      if (!hasCredits) {
        throw new BadRequestException('No credits available');
      }

      return hasCredits;
    } catch (error) {
      throw new BadRequestException('Authentication or credits check failed');
    }
  }
}
