import { forwardRef, Module } from '@nestjs/common';
import { PrismaModule } from 'nestjs-prisma';

import { AuthModule } from 'modules/auth/auth.module';
import { UsersService } from 'modules/users/users.service';
import { WorkspacesModule } from 'modules/workspaces/workspaces.module';

import { ConversationHistoryController } from './conversation-history.controller';
import { ConversationHistoryService } from './conversation-history.service';

@Module({
  imports: [PrismaModule, WorkspacesModule, forwardRef(() => AuthModule)],
  controllers: [ConversationHistoryController],
  providers: [ConversationHistoryService, UsersService],
  exports: [ConversationHistoryService],
})
export class ConversationHistoryModule {}
