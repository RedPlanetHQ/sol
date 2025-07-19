import { CacheModule } from '@nestjs/cache-manager';
import { Logger, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { PrismaModule } from 'nestjs-prisma';

import config from 'common/configs/config';
import { loggingMiddleware } from 'common/middleware/logging.middleware';

import { ActivityModule } from 'modules/activity/activity.module';
import { ALSModule } from 'modules/als/als.module';
import { AttachmentModule } from 'modules/attachments/attachments.module';
import { AuthModule } from 'modules/auth/auth.module';
import { AutomationModule } from 'modules/automation/automation.module';
import { ContentModule } from 'modules/content/content.module';
import { ConversationModule } from 'modules/conversation/conversation.module';
import { ConversationHistoryModule } from 'modules/conversation-history/conversation-history.module';
import { IntegrationAccountModule } from 'modules/integration-account/integration-account.module';
import { IntegrationDefinitionModule } from 'modules/integration-definition/integration-definition.module';
import { IntegrationsModule } from 'modules/integrations/integrations.module';
import { ListsModule } from 'modules/lists/lists.module';
import { OAuthCallbackModule } from 'modules/oauth-callback/oauth-callback.module';
import { PagesModule } from 'modules/pages/pages.module';
import { ReplicationModule } from 'modules/replication/replication.module';
import { SyncActionsModule } from 'modules/sync-actions/sync-actions.module';
import { TaskOccurenceModule } from 'modules/task-occurrence/task-occurrence.model';
import { TasksModule } from 'modules/tasks/tasks.module';
import { TasksHookModule } from 'modules/tasks-hook/tasks-hooks.module';
import { UsersModule } from 'modules/users/users.module';
import { VectorStoreModule } from 'modules/vector/vector.module';
import { WebhookModule } from 'modules/webhook/webhook.module';
import { WorkspacesModule } from 'modules/workspaces/workspaces.module';

import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    CacheModule.register({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 10,
      },
    ]),
    ConfigModule.forRoot({ isGlobal: true, load: [config] }),
    ConfigModule.forRoot({ envFilePath: '.env' }),
    PrismaModule.forRoot({
      isGlobal: true,
      prismaServiceOptions: {
        middlewares: [loggingMiddleware(new Logger('PrismaMiddleware'))], // configure your prisma middleware
      },
    }),

    MailerModule.forRoot({
      transport: {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: true,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      },
      defaults: {
        from: `${process.env.SMTP_DEFAULT_FROM}`,
      },
      template: {
        dir: `${process.cwd()}/templates`,
        adapter: new HandlebarsAdapter(),
        options: {
          strict: true,
        },
      },
    }),
    AuthModule.forRoot(),

    ALSModule,
    AttachmentModule,
    ReplicationModule,
    SyncActionsModule,

    UsersModule,
    WorkspacesModule,

    PagesModule,
    ContentModule,
    ListsModule,

    TasksModule,
    TaskOccurenceModule,
    TasksHookModule,

    ConversationModule,
    ConversationHistoryModule,

    IntegrationAccountModule,
    IntegrationDefinitionModule,
    WebhookModule,
    IntegrationsModule,
    OAuthCallbackModule,
    WebhookModule,

    ActivityModule,
    VectorStoreModule,

    AutomationModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,

    // { provide: APP_INTERCEPTOR, useClass: SyncActionsInterceptor },
  ],
})
export class AppModule {}
