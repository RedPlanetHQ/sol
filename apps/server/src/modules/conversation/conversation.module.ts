import { forwardRef, Module } from '@nestjs/common';
import { PrismaModule } from 'nestjs-prisma';

import { AuthModule } from 'modules/auth/auth.module';
import { UsersService } from 'modules/users/users.service';

import { ConversationController } from './conversation.controller';
import { ConversationService } from './conversation.service';

@Module({
  imports: [PrismaModule, forwardRef(() => AuthModule)],
  controllers: [ConversationController],
  providers: [ConversationService, UsersService],
  exports: [ConversationService],
})
export class ConversationModule {}
