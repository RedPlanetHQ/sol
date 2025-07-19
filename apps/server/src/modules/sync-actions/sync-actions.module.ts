import { HttpModule } from '@nestjs/axios';
import { forwardRef, Module } from '@nestjs/common';
import { PrismaModule, PrismaService } from 'nestjs-prisma';

import { ActivityModule } from 'modules/activity/activity.module';
import { AuthModule } from 'modules/auth/auth.module';
import { PagesModule } from 'modules/pages/pages.module';
import { TasksHookModule } from 'modules/tasks-hook/tasks-hooks.module';
import { UsersService } from 'modules/users/users.service';

import { SyncActionsController } from './sync-actions.controller';
import SyncActionsService from './sync-actions.service';

@Module({
  imports: [
    PrismaModule,
    HttpModule,
    PagesModule,
    TasksHookModule,
    ActivityModule,
    forwardRef(() => AuthModule),
  ],
  controllers: [SyncActionsController],
  // TODO: Add respective models used in the service. For now using prismaService
  providers: [SyncActionsService, PrismaService, UsersService],
  exports: [SyncActionsService],
})
export class SyncActionsModule {}
