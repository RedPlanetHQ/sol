import { Injectable } from '@nestjs/common';
import {
  ActionStatusEnum,
  Conversation,
  CreateConversationDto,
  Resource,
  UserTypeEnum,
} from '@redplanethq/sol-sdk';
import {
  ConversationContext,
  ConversationContextData,
} from '@redplanethq/sol-sdk';
import { auth, runs, tasks } from '@trigger.dev/sdk/v3';
import { PrismaService } from 'nestjs-prisma';
import { createConversationTitle } from 'triggers/conversation/create-conversation-title';

import { UsersService } from 'modules/users/users.service';

@Injectable()
export class ConversationService {
  constructor(
    private prisma: PrismaService,
    private user: UsersService,
  ) {}

  async createConversation(
    workspaceId: string,
    userId: string,
    conversationData: CreateConversationDto,
  ) {
    const { pageId, title, conversationId, ...otherData } = conversationData;
    // TODO: see where to add this later
    await this.user.getOrCreateApiKey(userId);

    if (conversationId) {
      const conversationHistory = await this.prisma.conversationHistory.create({
        data: {
          ...otherData,
          userType: UserTypeEnum.User,
          ...(userId && {
            user: {
              connect: { id: userId },
            },
          }),
          conversation: {
            connect: { id: conversationId },
          },
        },
        include: {
          conversation: true,
        },
      });

      const context = await this.getConversationContext(conversationHistory.id);
      const handler = await tasks.trigger(
        'chat',
        {
          conversationHistoryId: conversationHistory.id,
          conversationId: conversationHistory.conversation.id,
          context,
        },
        { tags: [conversationHistory.id, workspaceId, conversationId] },
      );

      return {
        id: handler.id,
        token: handler.publicAccessToken,
        conversationId: conversationHistory.conversation.id,
        conversationHistoryId: conversationHistory.id,
      };
    }

    const conversation = await this.prisma.conversation.create({
      data: {
        workspaceId,
        userId,
        pageId,

        title:
          title.substring(0, 100) ?? conversationData.message.substring(0, 100),
        ConversationHistory: {
          create: {
            userId,
            userType: UserTypeEnum.User,
            ...otherData,
          },
        },
      },
      include: {
        ConversationHistory: true,
      },
    });

    const conversationHistory = conversation.ConversationHistory[0];
    const context = await this.getConversationContext(conversationHistory.id);

    // Trigger conversation title task
    await tasks.trigger<typeof createConversationTitle>(
      createConversationTitle.id,
      {
        conversationId: conversation.id,
        message: conversationData.message,
      },
      { tags: [conversation.id, workspaceId] },
    );

    const handler = await tasks.trigger(
      'chat',
      {
        conversationHistoryId: conversationHistory.id,
        conversationId: conversation.id,
        context,
      },
      { tags: [conversationHistory.id, workspaceId, conversation.id] },
    );

    return {
      id: handler.id,
      token: handler.publicAccessToken,
      conversationId: conversation.id,
      conversationHistoryId: conversationHistory.id,
    };
  }

  async getConversationContext(
    conversationHistoryId: string,
  ): Promise<ConversationContext> {
    const conversationHistory =
      await this.prisma.conversationHistory.findUnique({
        where: { id: conversationHistoryId },
        include: { conversation: true },
      });

    if (!conversationHistory) {
      return null;
    }
    const context =
      (conversationHistory.context as ConversationContextData) || {};
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { agents = [], ...otherContextData } = context;

    // Get previous conversation history message and response
    let previousHistory = null;
    let allResources: Resource[] = [];

    if (conversationHistory.conversationId) {
      previousHistory = await this.prisma.conversationHistory.findMany({
        where: {
          conversationId: conversationHistory.conversationId,
          id: {
            not: conversationHistoryId,
          },
          deleted: null,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      // Collect resources from all previous history
      allResources = previousHistory.reduce((resources, history) => {
        const historyContext = history.context as ConversationContextData;
        if (historyContext?.resources) {
          return [...resources, ...historyContext.resources];
        }
        return resources;
      }, []);

      // Add current context resources if any
      if (context.resources) {
        allResources = [...allResources, ...context.resources];
      }

      // Remove duplicates
      allResources = [...new Set(allResources)];
    }

    return {
      previousHistory,
      agents: [],
      ...otherContextData,
      resources: allResources,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  }

  async getCurrentConversationRun(conversationId: string, workspaceId: string) {
    const conversationHistory = await this.prisma.conversationHistory.findFirst(
      {
        where: {
          conversationId,
          conversation: {
            workspaceId,
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
      },
    );

    const response = await runs.list({
      tag: [conversationId, conversationHistory.id],
      status: ['QUEUED', 'EXECUTING'],
      limit: 1,
    });

    const run = response.data[0];
    if (!run) {
      return undefined;
    }

    const publicToken = await auth.createPublicToken({
      scopes: {
        read: {
          runs: [run.id],
        },
      },
    });

    return {
      id: run.id,
      token: publicToken,
      conversationId,
      conversationHistoryId: conversationHistory.id,
    };
  }

  async stopConversation(conversationId: string, workspaceId: string) {
    const conversationHistory = await this.prisma.conversationHistory.findFirst(
      {
        where: {
          conversationId,
          conversation: {
            workspaceId,
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
      },
    );

    const response = await runs.list({
      tag: [conversationId, conversationHistory.id],
      status: ['QUEUED', 'EXECUTING'],
      limit: 1,
    });

    const run = response.data[0];
    if (!run) {
      await this.prisma.conversation.update({
        where: {
          id: conversationId,
        },
        data: {
          status: 'failed',
        },
      });

      return undefined;
    }

    return await runs.cancel(run.id);
  }

  async getConversation(conversationId: string): Promise<Conversation> {
    return this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });
  }

  async deleteConversation(conversationId: string): Promise<Conversation> {
    return this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        deleted: new Date().toISOString(),
      },
    });
  }

  async readConversation(conversationId: string): Promise<Conversation> {
    return this.prisma.conversation.update({
      where: { id: conversationId },
      data: { unread: false },
    });
  }

  async approveOrDecline(
    conversationId: string,
    workspaceId: string,
    approved: boolean,
  ) {
    // Find the latest two conversationHistory records for this conversation and workspace
    const conversationHistories =
      await this.prisma.conversationHistory.findMany({
        where: {
          conversationId,
          conversation: {
            workspaceId,
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 2,
      });

    // The most recent is at index 0, the previous one (last - 1) is at index 1
    const previousConversationHistory = conversationHistories[1];
    const latestConversationHistory = conversationHistories[0];

    await this.prisma.conversationExecutionStep.updateMany({
      where: {
        conversationHistoryId: latestConversationHistory.id,
        actionStatus: { in: [ActionStatusEnum.TOOL_REQUEST] },
      },
      data: {
        actionStatus: approved
          ? ActionStatusEnum.ACCEPT
          : ActionStatusEnum.DECLINE,
      },
    });

    const context = await this.getConversationContext(
      previousConversationHistory.id,
    );

    const handler = await tasks.trigger(
      'chat',
      {
        conversationHistoryId: previousConversationHistory.id,
        conversationId,
        isContinuation: true,
        context,
      },
      { tags: [previousConversationHistory.id, workspaceId, conversationId] },
    );

    return {
      id: handler.id,
      token: handler.publicAccessToken,
      conversationId,
      conversationHistoryId: previousConversationHistory.id,
    };
  }
}
