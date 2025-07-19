import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule, PrismaService } from 'nestjs-prisma';

import { AuthModule } from 'modules/auth/auth.module';
import { ListsModule } from 'modules/lists/lists.module';
import { TasksModule } from 'modules/tasks/tasks.module';
import { WorkspacesModule } from 'modules/workspaces/workspaces.module';

import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [
    PrismaModule,
    ListsModule,
    TasksModule,
    WorkspacesModule,
    forwardRef(() => AuthModule),
  ],
  controllers: [UsersController],
  providers: [PrismaService, UsersService],
  exports: [UsersService],
})
export class UsersModule {}
