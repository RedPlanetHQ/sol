import fs from 'fs';
import path from 'path';

import {
  Activity,
  Conversation,
  ConversationHistory,
  Prisma,
  PrismaClient,
  UserType,
  UserUsage,
  Workspace,
} from '@prisma/client';
import {
  IntegrationDefinition,
  LLMMappings,
  UserTypeEnum,
} from '@redplanethq/sol-sdk';
import { logger } from '@trigger.dev/sdk/v3';
import { CoreMessage } from 'ai';
import axios from 'axios';

import { HistoryStep } from './types';
import {
  AUTOMATION_SYSTEM_PROMPT,
  AUTOMATIONS_USER_PROMPT,
} from '../chat/prompt';
import { generate } from '../chat/stream-utils';

const prisma = new PrismaClient();

export interface InitChatPayload {
  conversationId: string;
  conversationHistoryId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context: any;
}

export class Preferences {
  timezone?: string;
  autonomy?: number;
  tone?: number;
  playfulness?: number;

  // Memory details
  memory_host?: string;
  memory_api_key?: string;
}

export interface RunChatPayload {
  conversationId: string;
  conversationHistoryId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context: any;
  conversation: Conversation;
  conversationHistory: ConversationHistory;
  isContinuation?: boolean;
  // Activity
  activity?: string;
  activityExecutionPlan?: string;
}

export const getAccessToken = async (
  clientId: string,
  clientSecret: string,
  refreshToken: string,
  redirectURL: string,
) => {
  const accessResponse = await axios.post(
    'https://oauth2.googleapis.com/token',
    {
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      redirect_uri: redirectURL,
    },
    { headers: {} },
  );

  return accessResponse.data;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function createMCPConfig(userMCP: any) {
  if (userMCP && userMCP.mcpServers) {
    const mcpServers = { ...userMCP.mcpServers };

    // Process each MCP server config
    Object.keys(mcpServers).forEach(async (serverKey) => {
      const server = mcpServers[serverKey];

      // If command is 'node', check all args for URLs to download
      if (server.args) {
        server.args = await Promise.all(
          server.args.map(async (arg: string) => {
            if (arg.startsWith('https://')) {
              const filename = arg.split('/').pop() || arg;
              const localPath = path.join(process.cwd(), filename);

              // Download file contents
              const response = await axios.get(arg, { responseType: 'text' });
              await fs.promises.writeFile(localPath, response.data);

              return filename; // Return local filename
            }
            return arg;
          }),
        );
      }
    });

    return {
      mcpServers,
    };
  }

  return {
    mcpServers: {},
  };
}

export const init = async (payload: InitChatPayload) => {
  logger.info('Loading init');
  const conversationHistory = await prisma.conversationHistory.findUnique({
    where: { id: payload.conversationHistoryId },
    include: { conversation: true },
  });

  const conversation = conversationHistory?.conversation as Conversation;

  const workspace = await prisma.workspace.findUnique({
    where: { id: conversation.workspaceId as string },
  });

  if (!workspace) {
    return { conversation, conversationHistory };
  }

  const workspacePreferences = workspace.preferences as Preferences;

  const timezone = (workspace.preferences as Preferences).timezone;

  const pat = await prisma.personalAccessToken.findFirst({
    where: { userId: workspace.userId as string, name: 'default' },
  });

  const user = await prisma.user.findFirst({
    where: { id: workspace.userId as string },
  });

  const integrationAccounts = await prisma.integrationAccount.findMany({
    where: {
      workspaceId: workspace.id,
    },
    include: { integrationDefinition: true },
  });

  // Create MCP server configurations for each integration account
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const integrationMCPServers: Record<string, any> = {};

  for (const account of integrationAccounts) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const spec = account.integrationDefinition?.spec as any;
      if (spec.mcp) {
        const mcpSpec = spec.mcp;
        const configuredMCP = { ...mcpSpec };

        // Replace config placeholders in environment variables
        if (configuredMCP.env) {
          for (const [key, value] of Object.entries(configuredMCP.env)) {
            if (typeof value === 'string' && value.includes('${config:')) {
              // Extract the config key from the placeholder
              const configKey = value.match(/\$\{config:(.*?)\}/)?.[1];
              if (
                configKey &&
                account.integrationConfiguration &&
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (account.integrationConfiguration as any)[configKey]
              ) {
                configuredMCP.env[key] = value.replace(
                  `\${config:${configKey}}`,
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  (account.integrationConfiguration as any)[configKey],
                );
              }
            }

            if (
              typeof value === 'string' &&
              value.includes('${integrationConfig:')
            ) {
              // Extract the config key from the placeholder
              const configKey = value.match(
                /\$\{integrationConfig:(.*?)\}/,
              )?.[1];
              if (
                configKey &&
                account.integrationDefinition.config &&
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (account.integrationDefinition.config as any)[configKey]
              ) {
                configuredMCP.env[key] = value.replace(
                  `\${integrationConfig:${configKey}}`,
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  (account.integrationDefinition.config as any)[configKey],
                );
              }
            }
          }
        }

        // Add to the MCP servers collection
        integrationMCPServers[account.integrationDefinition.slug] =
          configuredMCP;
      }
    } catch (error) {
      logger.error(
        `Failed to configure MCP for ${account.integrationDefinition?.slug}:`,
        error,
      );
    }
  }

  axios.interceptors.request.use((config) => {
    // Check if URL starts with /api and doesn't have a full host

    if (config.url?.startsWith('/api')) {
      config.url = `${process.env.BACKEND_HOST}${config.url.replace('/api', '')}`;
      config.headers.Authorization = `Bearer ${pat?.token}`;
      config.headers['x-updated-by'] = 'assistant';
    } else if (config.url.includes(process.env.BACKEND_HOST)) {
      config.headers.Authorization = `Bearer ${pat?.token}`;
    } else if (config.url?.startsWith('https://sol::core_memory')) {
      config.url = `${workspacePreferences.memory_host}/search`;
      config.headers.Authorization = `Bearer ${workspacePreferences.memory_api_key}`;
    }

    return config;
  });
  const mcp = await createMCPConfig(user.mcp);

  const mcpServers = { ...mcp.mcpServers, ...integrationMCPServers };

  logger.info(
    `Found users, workspace, conversation, ${JSON.stringify({ mcpServers })}`,
  );

  return {
    conversation,
    conversationHistory,
    token: pat?.token,
    userId: workspace.userId,
    userName: user.fullname,
    mcp: { mcpServers },
    timezone,
    preferences: workspace.preferences as Preferences,
  };
};

export const createConversationHistoryForAgent = async (
  conversationId: string,
) => {
  return await prisma.conversationHistory.create({
    data: {
      conversationId,
      message: 'Generating...',
      userType: 'Agent',
      thoughts: {},
    },
  });
};

export const getConversationHistoryFormat = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  previousHistory: any[],
): string => {
  if (previousHistory) {
    const historyText = previousHistory
      .map((history) => `${history.userType}: \n ${history.message}`)
      .join('\n------------\n');

    return historyText;
  }

  return '';
};

export const getPreviousExecutionHistory = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  previousHistory: any[],
): CoreMessage[] => {
  return previousHistory.map((history) => ({
    role: history.userType === 'User' ? 'user' : 'assistant',
    content: history.message,
  }));
};

export const getIntegrationDefinitionsForAgents = (agents: string[]) => {
  return prisma.integrationDefinitionV2.findMany({
    where: {
      slug: {
        in: agents,
      },
    },
  });
};

export const getIntegrationConfigForIntegrationDefinition = (
  integrationDefinitionId: string,
) => {
  return prisma.integrationAccount.findFirst({
    where: {
      integrationDefinitionId,
    },
  });
};

export const updateExecutionStep = async (
  step: HistoryStep,
  conversationHistoryId: string,
) => {
  const {
    thought,
    userMessage,
    skillInput,
    skillOutput,
    skillId,
    skillStatus,
    ...metadata
  } = step;

  await prisma.conversationExecutionStep.create({
    data: {
      thought: thought ?? '',
      message: userMessage ?? '',
      actionInput:
        typeof skillInput === 'object'
          ? JSON.stringify(skillInput)
          : skillInput,
      actionOutput:
        typeof skillOutput === 'object'
          ? JSON.stringify(skillOutput)
          : skillOutput,
      actionId: skillId,
      actionStatus: skillStatus,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      metadata: metadata as any,
      conversationHistoryId,
    },
  });
};

export const updateConversationHistoryMessage = async (
  userMessage: string,
  conversationHistoryId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  thoughts?: Record<string, any>,
) => {
  await prisma.conversationHistory.update({
    where: {
      id: conversationHistoryId,
    },
    data: {
      message: userMessage,
      thoughts,
      userType: UserType.Agent,
    },
  });
};

export const getExecutionStepsForConversation = async (
  conversationHistoryId: string,
) => {
  const lastExecutionSteps = await prisma.conversationExecutionStep.findMany({
    where: {
      conversationHistoryId,
    },
  });

  return lastExecutionSteps;
};

export const getCreditsForUser = async (userId: string) => {
  return await prisma.userUsage.findUnique({
    where: {
      userId,
    },
  });
};

export const updateUserCredits = async (
  userUsage: UserUsage,
  usedCredits: number,
) => {
  return await prisma.userUsage.update({
    where: {
      id: userUsage.id,
    },
    data: {
      availableCredits: userUsage.availableCredits - usedCredits,
      usedCredits: userUsage.usedCredits + usedCredits,
    },
  });
};

export const getActivityDetails = async (activityId: string) => {
  if (!activityId) {
    return {};
  }

  const activity = await prisma.activity.findFirst({
    where: {
      id: activityId,
    },
  });

  return {
    activityId,
    integrationAccountId: activity.integrationAccountId,
    sourceURL: activity.sourceURL,
  };
};

/**
 * Generates a random ID of 6 characters
 * @returns A random string of 6 characters
 */
export const generateRandomId = (): string => {
  // Define characters that can be used in the ID
  const characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';

  // Generate 6 random characters
  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    result += characters.charAt(randomIndex);
  }

  return result.toLowerCase();
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function flattenObject(obj: Record<string, any>, prefix = ''): string[] {
  return Object.entries(obj).reduce<string[]>((result, [key, value]) => {
    const entryKey = prefix ? `${prefix}_${key}` : key;

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      // For nested objects, flatten them and add to results
      return [...result, ...flattenObject(value, entryKey)];
    }

    // For primitive values or arrays, add directly
    return [...result, `- ${entryKey}: ${value}`];
  }, []);
}

export async function getContext(messages: CoreMessage[]) {
  let contextResponse = '';

  const gen = generate(
    messages,
    false,
    () => {},
    undefined,
    '',
    LLMMappings.GPT41,
  );

  for await (const chunk of gen) {
    if (typeof chunk === 'string') {
      contextResponse += chunk;
    } else if (chunk && typeof chunk === 'object' && chunk.message) {
      contextResponse += chunk.message;
    }
  }

  const outputRegex = /<output>\s*(.*?)\s*<\/output>/s;
  const match = contextResponse.match(outputRegex);

  if (match && match[1]) {
    try {
      return JSON.parse(match[1]);
    } catch (e) {
      logger.error(`Failed to parse context response: ${e}`);
      return [];
    }
  }

  return [];
}

export async function getAutomationContext(
  workspaceId: string,
  query: string,
): Promise<{
  found?: boolean;
  automations?: [];
  executionPlan?: string;
  reason?: string;
}> {
  const automations = await prisma.automation.findMany({
    where: {
      workspaceId,
      deleted: null,
    },
  });

  const automationsList = automations
    .map((automation) => {
      return `id: ${automation.id}\ntext: ${automation.text}\nservices: ${Array.isArray(automation.mcps) ? automation.mcps.join(',') : ''}\n\n`;
    })
    .join('');

  let automationContext: {
    found?: boolean;
    automations?: [];
    executionPlan?: string;
    reason?: string;
  } = {};
  try {
    // Update this later and give memory access to this
    automationContext = await getContext([
      {
        role: 'system',
        content: AUTOMATION_SYSTEM_PROMPT,
      },
      {
        role: 'user',
        content: AUTOMATIONS_USER_PROMPT.replace('{{USER_MEMORY}}', '')
          .replace('{{USER_AUTOMATIONS}}', automationsList)
          .replace('{{CURRENT_CONVERSATION_MESSAGE}}', query),
      },
    ]);
  } catch (e) {
    logger.error(e);
  }

  return automationContext;
}

export const updateConversationStatus = async (
  status: string,
  conversationId: string,
) => {
  const data: Prisma.ConversationUpdateInput = { status, unread: true };

  return await prisma.conversation.update({
    where: {
      id: conversationId,
    },
    data,
  });
};

export const getActivity = async (activityId: string) => {
  return await prisma.activity.findUnique({
    where: {
      id: activityId,
    },
    include: {
      workspace: true,
      integrationAccount: {
        include: {
          integrationDefinition: true,
        },
      },
    },
  });
};

export const updateActivity = async (
  activityId: string,
  rejectionReason: string,
) => {
  return await prisma.activity.update({
    where: {
      id: activityId,
    },
    data: {
      rejectionReason,
    },
  });
};

export const createConversation = async (
  activity: Activity,
  workspace: Workspace,
  integrationDefinition: IntegrationDefinition,
  automationContext: { automations?: string[]; executionPlan: string },
) => {
  const conversation = await prisma.conversation.create({
    data: {
      workspaceId: activity.workspaceId,
      userId: workspace.userId,
      title: activity.text.substring(0, 100),
      ConversationHistory: {
        create: {
          userId: workspace.userId,
          message: `Activity from ${integrationDefinition.name} \n Content: ${activity.text}`,
          userType: UserTypeEnum.User,
          activityId: activity.id,
          thoughts: { ...automationContext },
        },
      },
    },
    include: {
      ConversationHistory: true,
    },
  });

  return conversation;
};

export const updateAutomations = async (ids: string[]) => {
  try {
    // Use updateMany to update all matching records in a single query
    await prisma.automation.updateMany({
      where: {
        id: { in: ids },
      },
      data: {
        usedCount: {
          increment: 1,
        },
      },
    });
  } catch (e) {
    logger.error(e);
  }
};

export async function getContinuationAgentConversationHistory(
  conversationId: string,
): Promise<ConversationHistory | null> {
  return await prisma.conversationHistory.findFirst({
    where: {
      conversationId,
      userType: 'Agent',
      deleted: null,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 1,
  });
}
