import { forwardRef, Module } from '@nestjs/common';
import { PrismaModule, PrismaService } from 'nestjs-prisma';

import { AuthModule } from 'modules/auth/auth.module';
import { UsersService } from 'modules/users/users.service';

import { AutomationController } from './automation.controller';
import AutomationService from './automation.service';

@Module({
  imports: [PrismaModule, forwardRef(() => AuthModule)],
  controllers: [AutomationController],
  providers: [PrismaService, UsersService, AutomationService],
  exports: [AutomationService],
})
export class AutomationModule {}
