import { Module } from '@nestjs/common';
import { PrismaModule } from 'nestjs-prisma';

import { ContentModule } from 'modules/content/content.module';
import { UsersService } from 'modules/users/users.service';

import { PagesController } from './pages.controller';
import { PagesService } from './pages.service';

@Module({
  imports: [PrismaModule, ContentModule],
  controllers: [PagesController],
  providers: [PagesService, UsersService],
  exports: [PagesService],
})
export class PagesModule {}
