import { PrismaClient } from '@prisma/client';
import { ActionStatusEnum } from '@redplanethq/sol-sdk';
import { logger, metadata, task } from '@trigger.dev/sdk/v3';
import { format } from 'date-fns';

import { run } from './chat-utils';
import { addToMemory } from './memory-utils';
import { callSolTool } from '../sol-tools/sol-tools';
import { MCP } from '../utils/mcp';
import { HistoryStep } from '../utils/types';
import {
  createConversationHistoryForAgent,
  getActivityDetails,
  getContinuationAgentConversationHistory,
  getCreditsForUser,
  getPreviousExecutionHistory,
  init,
  RunChatPayload,
  updateConversationHistoryMessage,
  updateConversationStatus,
  updateExecutionStep,
  updateUserCredits,
} from '../utils/utils';

const prisma = new PrismaClient();

/**
 * Main chat task that orchestrates the agent workflow
 * Handles conversation context, agent selection, and LLM interactions
 */
export const chat = task({
  id: 'chat',
  maxDuration: 3000,
  queue: {
    name: 'chat',
    concurrencyLimit: 30,
  },
  init,
  run: async (payload: RunChatPayload, { init }) => {
    await updateConversationStatus('running', payload.conversationId);

    try {
      const usageCredits = await getCreditsForUser(init.userId);
      let creditForChat = 0;
      const activity = await getActivityDetails(payload.activity);

      logger.info(`Activity: ${JSON.stringify(activity)}`);

      if (usageCredits.availableCredits <= 0) {
        logger.error('No credits found for the user');
        return;
      }

      const { previousHistory, ...otherData } = payload.context;

      const isContinuation = payload.isContinuation || false;

      // Initialise mcp
      const mcp = new MCP();
      await mcp.init();

      let automationContext: string;
      if (activity) {
        automationContext = payload.activityExecutionPlan;
      }

      // Prepare context with additional metadata
      const context = {
        // Currently this is assuming we only have one page in context
        context: {
          ...(otherData.page && otherData.page.length > 0
            ? { page: otherData.page[0] }
            : {}),
          ...activity,
        },
        todayDate: format(
          new Date().toLocaleString('en-US', { timeZone: init.timezone }),
          "yyyy-MM-dd'T'HH:mm:ss.SSSxxx",
        ),
        workpsaceId: init?.conversation.workspaceId,
        resources: otherData.resources,
      };

      // Extract user's goal from conversation history
      const message = init?.conversationHistory?.message;
      // Retrieve execution history from previous interactions
      const previousExecutionHistory = getPreviousExecutionHistory(
        previousHistory ?? [],
      );

      let agentUserMessage = '';
      let agentConversationHistory;
      let stepHistory: HistoryStep[] = [];
      if (!isContinuation) {
        // Prepare conversation history in agent-compatible format
        agentConversationHistory = await createConversationHistoryForAgent(
          payload.conversationId,
        );
      } else {
        agentConversationHistory =
          await getContinuationAgentConversationHistory(payload.conversationId);

        stepHistory = await handleConfirmation(
          mcp,
          agentConversationHistory.id,
          init.mcp,
        );
      }

      await updateConversationHistoryMessage(
        agentUserMessage,
        agentConversationHistory?.id,
        { automation: automationContext },
      );

      const llmResponse = run(
        message,
        context,
        previousExecutionHistory,
        mcp,
        automationContext,
        stepHistory,
        init.mcp,
        {
          workspaceId: init.conversation.workspaceId,
          userId: init.userId,
          preferences: init.preferences,
        },
      );

      const stream = await metadata.stream('messages', llmResponse);

      let conversationStatus = 'success';
      for await (const step of stream) {
        if (step.type === 'STEP') {
          creditForChat += 1;
          const stepDetails = JSON.parse(step.message);

          if (stepDetails.skillStatus === ActionStatusEnum.TOOL_REQUEST) {
            conversationStatus = 'need_approval';
          }

          if (stepDetails.skillStatus === ActionStatusEnum.QUESTION) {
            conversationStatus = 'need_attention';
          }

          await updateExecutionStep(
            { ...stepDetails },
            agentConversationHistory.id,
          );

          agentUserMessage += stepDetails.userMessage;

          await updateConversationHistoryMessage(
            agentUserMessage,
            agentConversationHistory.id,
          );
        } else if (step.type === 'STREAM_END') {
          break;
        }
      }

      await updateUserCredits(usageCredits, creditForChat);
      await updateConversationStatus(
        conversationStatus,
        payload.conversationId,
      );

      await addToMemory(
        init.conversation.id,
        message,
        agentUserMessage,
        init.preferences,
        init.userName,
      );
    } catch (e) {
      await updateConversationStatus('failed', payload.conversationId);
      throw new Error(e);
    }
  },
});

async function handleConfirmation(
  mcp: MCP,
  agentConversationHistoryId: string,
  mcpConfig: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mcpServers: any;
  },
): Promise<HistoryStep[]> {
  const agentExecutionHistory = await prisma.conversationExecutionStep.findMany(
    {
      where: {
        conversationHistoryId: agentConversationHistoryId,
        deleted: null,
      },
    },
  );

  const history: HistoryStep[] = [];
  for await (const step of agentExecutionHistory) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stepMetadata = step.metadata as Record<string, any>;
    const stepHistory: HistoryStep = {
      agent: stepMetadata.agent,
      skill: stepMetadata.skill,
      skillId: step.actionId,
      userMessage: step.message,
      isQuestion: false,
      isFinal: false,
      tokenCount: stepMetadata.tokenCount || {},
      skillInput: step.actionInput,
      skillOutput: step.actionOutput,
      skillStatus: step.actionStatus as ActionStatusEnum,
    };

    if (stepHistory.skillStatus === ActionStatusEnum.ACCEPT) {
      let result;

      await mcp.load([stepHistory.agent], mcpConfig);

      try {
        if (stepHistory.agent === 'sol') {
          result = await callSolTool(
            stepHistory.skill,
            JSON.parse(stepHistory.skillInput),
          );
        } else {
          result = await mcp.callTool(
            stepHistory.skill,
            JSON.parse(stepHistory.skillInput),
          );
        }
      } catch (e) {
        console.log(e);
        logger.error(e);
        stepHistory.skillInput = stepHistory.skillInput;
        stepHistory.observation = JSON.stringify(e);
        stepHistory.isError = true;
      }

      stepHistory.skillOutput =
        typeof result === 'object' ? JSON.stringify(result, null, 2) : result;
      stepHistory.skillStatus = ActionStatusEnum.SUCCESS;
      stepHistory.observation = stepHistory.skillOutput;

      await prisma.conversationExecutionStep.update({
        where: {
          id: step.id,
        },
        data: {
          actionStatus: stepHistory.skillStatus,
          actionOutput: stepHistory.skillOutput,
          metadata: {
            ...stepMetadata,
            observation: stepHistory.observation,
          },
        },
      });
    } else if (stepHistory.skillStatus === ActionStatusEnum.DECLINE) {
      stepHistory.skillOutput =
        'The user declined to execute this tool call. Please suggest an alternative approach or ask for clarification.';
      stepHistory.observation = stepHistory.skillOutput;
    }

    history.push(stepHistory);
  }

  return history;
}
