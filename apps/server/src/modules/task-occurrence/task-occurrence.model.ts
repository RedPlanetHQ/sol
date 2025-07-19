import { forwardRef, Module } from '@nestjs/common';
import { PrismaModule, PrismaService } from 'nestjs-prisma';

import { AuthModule } from 'modules/auth/auth.module';
import { PagesModule } from 'modules/pages/pages.module';
import { UsersService } from 'modules/users/users.service';

import { TaskOccurenceController } from './task-occurrence.controller';
import { TaskOccurenceService } from './task-occurrence.service';

@Module({
  imports: [PrismaModule, PagesModule, forwardRef(() => AuthModule)],
  controllers: [TaskOccurenceController],
  providers: [PrismaService, TaskOccurenceService, UsersService],
  exports: [TaskOccurenceService],
})
export class TaskOccurenceModule {}
