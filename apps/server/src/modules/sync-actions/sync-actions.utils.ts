import {
  SyncActionTypeEnum,
  ModelName,
  SyncAction,
  TaskHookAction,
} from '@redplanethq/sol-sdk';
import { PrismaService } from 'nestjs-prisma';

export function convertToActionType(action: string): SyncActionTypeEnum {
  switch (action.toLowerCase()) {
    case 'insert':
      return SyncActionTypeEnum.I;
    case 'update':
      return SyncActionTypeEnum.U;
    case 'delete':
      return SyncActionTypeEnum.D;
  }

  return null;
}

export function convertToActionTypeForUser(action: string): TaskHookAction {
  switch (action.toLowerCase()) {
    case 'insert':
      return 'create';
    case 'update':
      return 'update';
    case 'delete':
      return 'delete';
  }

  return null;
}

export function convertLsnToInt(lsn: string) {
  const [logFileNumber, byteOffset] = lsn.split('/');
  const hexString = logFileNumber + byteOffset;
  return parseInt(hexString, 16);
}

export async function getWorkspaceId(
  prisma: PrismaService,
  modelName: ModelName,
  modelId: string,
): Promise<string> {
  switch (modelName) {
    case ModelName.Workspace:
      return modelId;

    case ModelName.Page:
      const page = await prisma.page.findUnique({
        where: { id: modelId },
      });
      return page.workspaceId;

    case ModelName.Task:
      const task = await prisma.task.findUnique({
        where: { id: modelId },
      });
      return task.workspaceId;

    case ModelName.TaskOccurrence:
      const taskOccurrence = await prisma.taskOccurrence.findUnique({
        where: { id: modelId },
      });
      return taskOccurrence.workspaceId;

    case ModelName.IntegrationAccount:
      const integrationAccount = await prisma.integrationAccount.findUnique({
        where: { id: modelId },
      });
      return integrationAccount.workspaceId;

    case ModelName.Conversation:
      const conversationEntity = await prisma.conversation.findUnique({
        where: { id: modelId },
      });
      return conversationEntity.workspaceId;

    case ModelName.List:
      const list = await prisma.list.findUnique({
        where: { id: modelId },
      });
      return list.workspaceId;

    case ModelName.ConversationHistory:
      const conversationHistoryEntity =
        await prisma.conversationHistory.findUnique({
          where: { id: modelId },
          include: { conversation: true },
        });
      return conversationHistoryEntity.conversation.workspaceId;

    case ModelName.TaskOccurrence:
      const taskOccurence = await prisma.taskOccurrence.findUnique({
        where: { id: modelId },
      });

      return taskOccurence.workspaceId;

    case ModelName.AgentWorklog:
      const agentWorklog = await prisma.agentWorklog.findUnique({
        where: { id: modelId },
      });

      return agentWorklog.workspaceId;

    case ModelName.Activity:
      const activity = await prisma.activity.findUnique({
        where: { id: modelId },
      });

      return activity.workspaceId;

    case ModelName.Automation:
      const automation = await prisma.automation.findUnique({
        where: { id: modelId },
      });

      return automation.workspaceId;

    default:
      return undefined;
  }
}

export async function getModelData(
  prisma: PrismaService,
  modelName: ModelName,
  modelId: string,
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const modelMap: Record<ModelName, any> = {
    Activity: prisma.activity,
    Workspace: prisma.workspace,
    Page: prisma.page,
    Task: prisma.task,
    TaskOccurrence: prisma.taskOccurrence,
    Conversation: prisma.conversation,
    ConversationHistory: prisma.conversationHistory,
    List: prisma.list,
    IntegrationAccount: {
      findUnique: (args: { where: { id: string } }) =>
        prisma.integrationAccount.findUnique({
          ...args,
          select: {
            id: true,
            accountId: true,
            integratedById: true,
            createdAt: true,
            updatedAt: true,
            deleted: true,
            settings: true,
            workspaceId: true,
            integrationDefinitionId: true,
          },
        }),
    },
    TaskOccurence: prisma.taskOccurrence,
    AgentWorklog: prisma.agentWorklog,
    Automation: prisma.automation,
  };

  const model = modelMap[modelName];

  if (model) {
    return await model.findUnique({ where: { id: modelId } });
  }

  return undefined;
}

export async function getSyncActionsData(
  prisma: PrismaService,
  syncActionsData: SyncAction[],
) {
  const modelDataResults = await Promise.all(
    syncActionsData.map((actionData) =>
      getModelData(prisma, actionData.modelName, actionData.modelId),
    ),
  );

  return syncActionsData.reduce((result, actionData, index) => {
    const data = modelDataResults[index];
    if (data) {
      result.push({ data, ...actionData });
    }
    return result;
  }, []);
}

export async function getLastSequenceId(
  prisma: PrismaService,
  workspaceId: string,
): Promise<bigint> {
  const lastSyncAction = await prisma.syncAction.findFirst({
    where: {
      workspaceId,
    },
    orderBy: {
      sequenceId: 'desc',
    },
    distinct: ['modelName', 'workspaceId', 'modelId'],
  });

  return lastSyncAction.sequenceId;
}
