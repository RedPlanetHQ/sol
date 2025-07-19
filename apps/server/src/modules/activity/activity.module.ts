import { forwardRef, Module } from '@nestjs/common';
import { PrismaModule, PrismaService } from 'nestjs-prisma';

import { AuthModule } from 'modules/auth/auth.module';
import { ConversationHistoryModule } from 'modules/conversation-history/conversation-history.module';
import { UsersService } from 'modules/users/users.service';

import { ActivityController } from './activity.controller';
import ActivityService from './activity.service';

@Module({
  imports: [
    PrismaModule,
    ConversationHistoryModule,
    forwardRef(() => AuthModule),
  ],
  controllers: [ActivityController],
  providers: [PrismaService, ActivityService, UsersService],
  exports: [ActivityService],
})
export class ActivityModule {}
