import { HttpModule } from '@nestjs/axios';
import { forwardRef, Module } from '@nestjs/common';
import { PrismaModule, PrismaService } from 'nestjs-prisma';

import { AuthModule } from 'modules/auth/auth.module';
import { ListsModule } from 'modules/lists/lists.module';
import { UsersService } from 'modules/users/users.service';

import { WorkspacesController } from './workspaces.controller';
import WorkspacesService from './workspaces.service';

@Module({
  imports: [
    PrismaModule,
    HttpModule,
    ListsModule,
    forwardRef(() => AuthModule),
  ],
  controllers: [WorkspacesController],
  providers: [WorkspacesService, PrismaService, UsersService],
  exports: [WorkspacesService],
})
export class WorkspacesModule {}
