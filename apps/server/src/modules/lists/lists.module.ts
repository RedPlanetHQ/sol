import { forwardRef, Module } from '@nestjs/common';
import { PrismaModule, PrismaService } from 'nestjs-prisma';

import { AuthModule } from 'modules/auth/auth.module';
import { PagesModule } from 'modules/pages/pages.module';
import { UsersService } from 'modules/users/users.service';

import { ListsController } from './lists.controller';
import { ListsService } from './lists.service';

@Module({
  imports: [PrismaModule, PagesModule, forwardRef(() => AuthModule)],
  controllers: [ListsController],
  providers: [PrismaService, ListsService, UsersService],
  exports: [ListsService],
})
export class ListsModule {}
