import { forwardRef, Module } from '@nestjs/common';
import { PrismaModule, PrismaService } from 'nestjs-prisma';

import { AuthModule } from 'modules/auth/auth.module';
import { ContentModule } from 'modules/content/content.module';
import { ConversationModule } from 'modules/conversation/conversation.module';
import { IntegrationsService } from 'modules/integrations/integrations.service';
import { PagesService } from 'modules/pages/pages.service';
import { TaskOccurenceModule } from 'modules/task-occurrence/task-occurrence.model';
import { TaskOccurenceService } from 'modules/task-occurrence/task-occurrence.service';
import { UsersService } from 'modules/users/users.service';
import { VectorStoreModule } from 'modules/vector/vector.module';

import { TasksAIController } from './tasks-ai.controller';
import TasksAIService from './tasks-ai.service';
import { TaskVectorService } from './tasks-vector.service';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  imports: [
    PrismaModule,
    ConversationModule,
    ContentModule,
    TaskOccurenceModule,
    VectorStoreModule,
    forwardRef(() => AuthModule),
  ],
  controllers: [TasksController, TasksAIController],
  providers: [
    PrismaService,
    TasksService,
    TasksAIService,
    UsersService,
    TaskOccurenceService,
    IntegrationsService,
    PagesService,
    TaskVectorService,
  ],
  exports: [TasksService],
})
export class TasksModule {}
