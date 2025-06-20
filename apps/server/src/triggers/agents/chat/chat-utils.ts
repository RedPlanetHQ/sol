/* eslint-disable @typescript-eslint/no-explicit-any */

import { ActionStatusEnum, LLMMappings } from '@redplanethq/sol-sdk';
import { logger, runs, tasks } from '@trigger.dev/sdk/v3';
import { CoreMessage, jsonSchema, tool, ToolSet } from 'ai';
import Handlebars from 'handlebars';
import { claudeCode } from 'triggers/coding/claude-code';

import { claudeCodeTool } from './code-tools';
import {
  ACTIVITY_SYSTEM_PROMPT,
  CONFIRMATION_CHECKER_PROMPT,
  CONFIRMATION_CHECKER_USER_PROMPT,
  REACT_SYSTEM_PROMPT,
  REACT_USER_PROMPT,
} from './prompt';
import { generate, processTag } from './stream-utils';
import { AgentMessage, AgentMessageType, Message } from './types';
import { callSolTool, getSolTools } from '../sol-tools/sol-tools';
import { MCP } from '../utils/mcp';
import { ExecutionState, HistoryStep, TotalCost } from '../utils/types';
import { flattenObject, Preferences } from '../utils/utils';

interface LLMOutputInterface {
  response: AsyncGenerator<
    | string
    | {
        type: string;
        toolName: string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        args?: any;
        toolCallId?: string;
        message?: string;
      },
    any,
    any
  >;
}

const askConfirmationTool = tool({
  description: 'Ask the user for confirmation',
  parameters: jsonSchema({
    type: 'object',
    properties: {
      message: {
        type: 'string',
        description: 'The message to ask the user for confirmation',
      },
      impact: {
        type: 'string',
        description: 'The impact of the action',
      },
    },
    required: ['message', 'impact'],
    additionalProperties: false,
  }),
});

const loadMCPTools = tool({
  description:
    'Load tools for a specific integration. Call this when you need to use a third-party service.',
  parameters: jsonSchema({
    type: 'object',
    properties: {
      integration: {
        type: 'array',
        items: {
          type: 'string',
        },
        description:
          'Array of integration names to load (e.g., ["github", "linear", "slack"])',
      },
    },
    required: ['integration'],
    additionalProperties: false,
  }),
});

async function needConfirmation(
  toolCalls: any[],
  autonomy: number,
  userQuery: string,
): Promise<Record<string, any> | undefined> {
  const userPromptHandler = Handlebars.compile(
    CONFIRMATION_CHECKER_USER_PROMPT,
  );

  const userPrompt = userPromptHandler({
    TOOL_CALLS: toolCalls,
    AUTONOMY: autonomy,
    USER_QUERY: userQuery,
  });

  const messages: CoreMessage[] = [];
  messages.push({ role: 'system', content: CONFIRMATION_CHECKER_PROMPT });
  messages.push({ role: 'user', content: userPrompt });

  const response = generate(
    messages,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (_event) => {
      // console.log(event);
    },
    {
      ask_confirmation: askConfirmationTool,
    },
    undefined,
    LLMMappings.GPT41,
  );

  for await (const chunk of response) {
    if (
      typeof chunk === 'object' &&
      chunk.type === 'tool-call' &&
      chunk.toolName === 'ask_confirmation'
    ) {
      return chunk;
    }
  }
  return undefined;
}

function toolToMessage(history: HistoryStep[], messages: CoreMessage[]) {
  for (let i = 0; i < history.length; i++) {
    const step = history[i];

    // Add assistant message with tool calls
    if (step.observation && step.skillId) {
      messages.push({
        role: 'assistant',
        content: [
          {
            type: 'tool-call',
            toolCallId: step.skillId,
            toolName: step.skill,
            args:
              typeof step.skillInput === 'string'
                ? JSON.parse(step.skillInput)
                : step.skillInput,
          },
        ],
      });

      messages.push({
        role: 'tool',
        content: [
          {
            type: 'tool-result',
            toolName: step.skill,
            toolCallId: step.skillId,
            result: step.observation,
            isError: step.isError,
          },
        ],
      } as any);
    }
    // Handle format correction steps (observation exists but no skillId)
    else if (step.observation && !step.skillId) {
      // Add as a system message for format correction
      messages.push({
        role: 'system',
        content: step.observation,
      });
    }
  }

  return messages;
}

function makeNextCall(
  executionState: ExecutionState,
  TOOLS: ToolSet,
  totalCost: TotalCost,
  availableMCPServers: string[],
  preferences: Preferences,
): LLMOutputInterface {
  const { context, history, previousHistory } = executionState;

  const promptInfo = {
    USER_MESSAGE: executionState.query,
    CONTEXT: context,
    USER_MEMORY: executionState.userMemoryContext,
    AUTOMATION_CONTEXT: executionState.automationContext,
    AVAILABLE_MCP_TOOLS: availableMCPServers.join(', '),
    AUTONOMY_LEVEL: preferences.autonomy ?? 50,
    TONE_LEVEL: preferences.tone ?? 50,
    PLAYFULNESS_LEVEL: preferences.playfulness ?? 50,
  };

  let messages: CoreMessage[] = [];

  const systemTemplateHandler = Handlebars.compile(REACT_SYSTEM_PROMPT);
  let systemPrompt = systemTemplateHandler(promptInfo);

  const userTemplateHandler = Handlebars.compile(REACT_USER_PROMPT);
  const userPrompt = userTemplateHandler(promptInfo);

  if (executionState.context.includes('activityId')) {
    const activityTemplateHandler = Handlebars.compile(ACTIVITY_SYSTEM_PROMPT);
    const activityPrompt = activityTemplateHandler(promptInfo);
    systemPrompt += `\n\n\n ${activityPrompt}`;
  }

  // Always start with a system message (this does use tokens but keeps the instructions clear)
  messages.push({ role: 'system', content: systemPrompt });

  // For subsequent queries, include only final responses from previous exchanges if available
  if (previousHistory && previousHistory.length > 0) {
    messages = [...messages, ...previousHistory];
  }

  // Add the current user query (much simpler than the full prompt)
  messages.push({ role: 'user', content: userPrompt });

  // Include any steps from the current interaction
  if (history.length > 0) {
    messages = toolToMessage(history, messages);
  }

  // Get the next action from the LLM
  const response = generate(
    messages,
    (event) => {
      const usage = event.usage;
      totalCost.inputTokens += usage.promptTokens;
      totalCost.outputTokens += usage.completionTokens;
    },
    TOOLS,
  );

  return { response };
}

export async function* run(
  message: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context: Record<string, any>,
  previousHistory: CoreMessage[],
  mcp: MCP,
  automationContext: string,
  stepHistory: HistoryStep[],
  availableMCPServers: Record<string, any>,
  {
    preferences,
    userId,
    workspaceId,
  }: { preferences: Preferences; workspaceId: string; userId: string },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): AsyncGenerator<AgentMessage, any, any> {
  let guardLoop = 0;

  let tools = {
    ...(await mcp.allTools()),
    ...getSolTools(!!preferences?.memory_host && !!preferences?.memory_api_key),
    load_mcp: loadMCPTools,
    claude_code: claudeCodeTool,
  };

  logger.info('Tools have been formed');

  let contextText = '';
  if (context) {
    // Process the entire context object at once
    contextText = flattenObject(context).join('\n');
  }

  const executionState: ExecutionState = {
    query: message,
    context: contextText,
    previousHistory,
    automationContext,
    history: stepHistory, // Track the full ReAct history
    completed: false,
  };

  const totalCost: TotalCost = { inputTokens: 0, outputTokens: 0, cost: 0 };

  try {
    while (!executionState.completed && guardLoop < 10) {
      logger.info(`Starting the loop: ${guardLoop}`);

      const { response: llmResponse } = makeNextCall(
        executionState,
        tools,
        totalCost,
        Object.keys(availableMCPServers.mcpServers),
        preferences,
      );

      let toolCallInfo;

      const messageState = {
        inTag: false,
        message: '',
        messageEnded: false,
        lastSent: '',
      };

      const questionState = {
        inTag: false,
        message: '',
        messageEnded: false,
        lastSent: '',
      };

      let totalMessage = '';
      let askConfirmation = false;
      const toolCalls = [];

      // LLM thought response
      for await (const chunk of llmResponse) {
        if (typeof chunk === 'object' && chunk.type === 'tool-call') {
          toolCallInfo = chunk;
          toolCalls.push(chunk);
          if (
            chunk.toolName.includes('--') &&
            !chunk.toolName.includes('sol--')
          ) {
            askConfirmation = true;
          }
        }

        totalMessage += chunk;

        if (!messageState.messageEnded) {
          yield* processTag(
            messageState,
            totalMessage,
            chunk as string,
            '<final_response>',
            '</final_response>',
            {
              start: AgentMessageType.MESSAGE_START,
              chunk: AgentMessageType.MESSAGE_CHUNK,
              end: AgentMessageType.MESSAGE_END,
            },
          );
        }

        if (!questionState.messageEnded) {
          yield* processTag(
            questionState,
            totalMessage,
            chunk as string,
            '<question_response>',
            '</question_response>',
            {
              start: AgentMessageType.MESSAGE_START,
              chunk: AgentMessageType.MESSAGE_CHUNK,
              end: AgentMessageType.MESSAGE_END,
            },
          );
        }
      }

      logger.info(`Cost for thought: ${JSON.stringify(totalCost)}`);

      if (askConfirmation) {
        const confirmation = await needConfirmation(
          toolCalls,
          preferences.autonomy,
          message,
        );
        if (confirmation) {
          yield Message('', AgentMessageType.MESSAGE_START);
          yield Message(
            confirmation.args.message,
            AgentMessageType.MESSAGE_CHUNK,
          );
          yield Message('', AgentMessageType.MESSAGE_END);

          for (const toolCallInfo of toolCalls) {
            const agent = toolCallInfo.toolName.split('--')[0];

            const stepRecord: HistoryStep = {
              agent,
              thought: '',
              skill: toolCallInfo.toolName,
              skillId: toolCallInfo.toolCallId,
              userMessage: '',
              isQuestion: false,
              isFinal: false,
              tokenCount: totalCost,
              skillInput: JSON.stringify(toolCallInfo.args),
              skillOutput: '',
              skillStatus: ActionStatusEnum.TOOL_REQUEST,
            };
            stepRecord.userMessage = `\n<skill id="${stepRecord.skillId}" name="${stepRecord.skill}" agent=${agent}></skill>\n`;

            yield Message(JSON.stringify(stepRecord), AgentMessageType.STEP);

            yield Message('', AgentMessageType.MESSAGE_START);
            yield Message(
              stepRecord.userMessage,
              AgentMessageType.MESSAGE_CHUNK,
            );
            yield Message('', AgentMessageType.MESSAGE_END);
            executionState.history.push(stepRecord);
          }
          break;
        }
      }

      // Replace the error-handling block with this self-correcting implementation
      if (
        !totalMessage.includes('final_response') &&
        !totalMessage.includes('question_response') &&
        !toolCallInfo
      ) {
        // Log the issue for debugging
        logger.info(
          `Invalid response format detected. Attempting to get proper format.`,
        );

        // Extract the raw content from the invalid response
        const rawContent = totalMessage
          .replace(/(<[^>]*>|<\/[^>]*>)/g, '')
          .trim();

        // Create a correction step
        const stepRecord: HistoryStep = {
          thought: '',
          skill: '',
          skillId: '',
          userMessage: 'Sigma agent error, retrying \n',
          isQuestion: false,
          isFinal: false,
          tokenCount: totalCost,
          skillInput: '',
          observation: `Your last response was not in a valid format. You must respond with EXACTLY ONE of the required formats: either a tool call, <question_response> tags, or <final_response> tags. Please reformat your previous response using the correct format:\n\n${rawContent}`,
        };

        yield Message('', AgentMessageType.MESSAGE_START);
        yield Message(stepRecord.userMessage, AgentMessageType.MESSAGE_CHUNK);
        yield Message('', AgentMessageType.MESSAGE_END);

        // Add this step to the history
        yield Message(JSON.stringify(stepRecord), AgentMessageType.STEP);
        executionState.history.push(stepRecord);

        // Log that we're continuing the loop with a correction request
        logger.info(`Added format correction request to history.`);

        // Don't mark as completed - let the loop continue
        guardLoop++; // Still increment to prevent infinite loops
        continue;
      }

      // Record this step in history
      const stepRecord: HistoryStep = {
        thought: '',
        skill: '',
        skillId: '',
        userMessage: '',
        isQuestion: false,
        isFinal: false,
        tokenCount: totalCost,
        skillInput: '',
      };

      if (totalMessage && totalMessage.includes('final_response')) {
        executionState.completed = true;
        stepRecord.isFinal = true;
        stepRecord.userMessage = messageState.message;
        stepRecord.finalTokenCount = totalCost;
        stepRecord.skillStatus = ActionStatusEnum.SUCCESS;
        yield Message(JSON.stringify(stepRecord), AgentMessageType.STEP);
        executionState.history.push(stepRecord);
        break;
      }

      if (totalMessage && totalMessage.includes('question_response')) {
        executionState.completed = true;
        stepRecord.isQuestion = true;
        stepRecord.userMessage = questionState.message;
        stepRecord.finalTokenCount = totalCost;
        stepRecord.skillStatus = ActionStatusEnum.QUESTION;
        yield Message(JSON.stringify(stepRecord), AgentMessageType.STEP);
        executionState.history.push(stepRecord);
        break;
      }

      if (toolCalls && toolCalls.length > 0) {
        // Run all tool calls in parallel
        for (const toolCallInfo of toolCalls) {
          const skillName = toolCallInfo.toolName;
          const skillId = toolCallInfo.toolCallId;
          const skillInput = toolCallInfo.args;

          const toolName = skillName.split('--')[1];
          const agent = skillName.split('--')[0];

          const stepRecord: HistoryStep = {
            agent,
            thought: '',
            skill: skillName,
            skillId,
            userMessage: '',
            isQuestion: false,
            isFinal: false,
            tokenCount: totalCost,
            skillInput: JSON.stringify(skillInput),
          };

          if (toolName !== 'load_mcp') {
            const skillMessageToSend = `\n<skill id="${skillId}" name="${toolName}" agent=${agent}></skill>\n`;

            stepRecord.userMessage += skillMessageToSend;

            yield Message('', AgentMessageType.MESSAGE_START);
            yield Message(skillMessageToSend, AgentMessageType.MESSAGE_CHUNK);
            yield Message('', AgentMessageType.MESSAGE_END);
          }

          let result;
          try {
            logger.info(
              `skillName: ${skillName} \n Parsed Input: ${JSON.stringify(skillInput)}`,
            );
            if (agent === 'sol') {
              result = await callSolTool(skillName, skillInput);
            } else if (skillName === 'load_mcp') {
              await mcp.load(skillInput.integration, availableMCPServers);
              tools = {
                ...tools,
                ...(await mcp.allTools()),
              };
              result = 'MCP integration loaded successfully';
            } else if (skillName === 'claude_code') {
              const run = await tasks.trigger(claudeCode.id, {
                workspaceId,
                userId,
                ...skillInput,
              });

              result = [];
              for await (const part of runs
                .subscribeToRun<typeof claudeCode>(run.id)
                .withStreams()) {
                if (part.type === 'run') {
                  if (
                    [
                      'FAILED',
                      'CRASHED',
                      'INTERRUPTED',
                      'SYSTEM_FAILURE',
                    ].includes(part.run.status)
                  ) {
                    result = part.run.error;
                    break;
                  }
                } else if (part.type === 'messages') {
                  yield Message('', AgentMessageType.SKILL_START);
                  yield Message(part.chunk, AgentMessageType.SKILL_CHUNK);
                  yield Message('', AgentMessageType.SKILL_END);

                  result.push(part.chunk);

                  if (part.chunk.type === 'complete') {
                    break;
                  }
                }
              }
            } else {
              result = await mcp.callTool(skillName, skillInput);
            }

            stepRecord.skillOutput =
              typeof result === 'object'
                ? JSON.stringify(result, null, 2)
                : result;
            stepRecord.observation = stepRecord.skillOutput;
          } catch (e) {
            logger.error(e);
            stepRecord.skillInput = skillInput;
            stepRecord.observation = JSON.stringify(e);
            stepRecord.isError = true;
          }

          logger.info(`Skill step: ${JSON.stringify(stepRecord)}`);

          yield Message(JSON.stringify(stepRecord), AgentMessageType.STEP);
          executionState.history.push(stepRecord);
        }
      }
      guardLoop++;
    }
    yield Message('Stream ended', AgentMessageType.STREAM_END);
  } catch (e) {
    logger.error(e);
    yield Message(e.message, AgentMessageType.ERROR);
    yield Message('Stream ended', AgentMessageType.STREAM_END);
  }
}
