/* eslint-disable @typescript-eslint/no-explicit-any */

import { ActionStatusEnum, LLMMappings } from '@redplanethq/sol-sdk';
import { logger } from '@trigger.dev/sdk/v3';
import { CoreMessage, DataContent, jsonSchema, tool, ToolSet } from 'ai';
import axios from 'axios';
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
import {
  ExecutionState,
  HistoryStep,
  Resource,
  TotalCost,
} from '../utils/types';
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

const seeFileTool = tool({
  description: 'See the content of a file/image',
  parameters: jsonSchema({
    type: 'object',
    properties: {
      files: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'The URL of the file/image',
            },
            fileType: {
              type: 'string',
              description:
                'The file type (e.g., "image/png", "image/jpeg", "application/pdf")',
            },
          },
          required: ['url', 'fileType'],
          additionalProperties: false,
        },
        description:
          'Array of file/image objects each containing a URL and file type',
      },
    },
    required: ['files'],
    additionalProperties: false,
  }),
});

const internalTools = ['sol--load_mcp', 'sol--see_file'];

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
    (_event) => {},
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

async function addResources(messages: CoreMessage[], resources: Resource[]) {
  const resourcePromises = resources.map(async (resource) => {
    // Remove everything before "/api" in the publicURL
    if (resource.publicURL) {
      const apiIndex = resource.publicURL.indexOf('/api');
      if (apiIndex !== -1) {
        resource.publicURL = resource.publicURL.substring(apiIndex);
      }
    }
    const response = await axios.get(resource.publicURL, {
      responseType: 'arraybuffer',
    });

    if (resource.fileType.startsWith('image/')) {
      return {
        type: 'image',
        image: response.data as DataContent,
      };
    }

    return {
      type: 'file',
      data: response.data as DataContent,

      mimeType: resource.fileType,
    };
  });

  const content = await Promise.all(resourcePromises);

  return [...messages, { role: 'user', content } as CoreMessage];
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

async function makeNextCall(
  executionState: ExecutionState,
  TOOLS: ToolSet,
  totalCost: TotalCost,
  availableMCPServers: string[],
  preferences: Preferences,
): Promise<LLMOutputInterface> {
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

  if (executionState.resources && executionState.resources.length > 0) {
    messages = await addResources(messages, executionState.resources);
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
    'sol--load_mcp': loadMCPTools,
    'claude--coding': claudeCodeTool,
    'sol--see_file': seeFileTool,
  };

  logger.info('Tools have been formed');

  let contextText = '';
  let resources = [];
  if (context) {
    // Extract resources and remove from context
    resources = context.resources || [];
    delete context.resources;

    // Process remaining context
    contextText = flattenObject(context).join('\n');
  }

  const executionState: ExecutionState = {
    query: message,
    context: contextText,
    resources,
    previousHistory,
    automationContext,
    history: stepHistory, // Track the full ReAct history
    completed: false,
  };

  const totalCost: TotalCost = { inputTokens: 0, outputTokens: 0, cost: 0 };

  try {
    while (!executionState.completed && guardLoop < 50) {
      logger.info(`Starting the loop: ${guardLoop}`);

      const { response: llmResponse } = await makeNextCall(
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
            !chunk.toolName.includes('sol--') &&
            !chunk.toolName.includes('claude--') &&
            !internalTools.includes(chunk.toolName)
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
            const toolName = toolCallInfo.toolName.split('--')[1];

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
            stepRecord.userMessage = `\n<skill id="${stepRecord.skillId}" name="${toolName}" agent="${agent}"></skill>\n`;

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

          if (!internalTools.includes(toolName)) {
            const skillMessageToSend = `\n<skill id="${skillId}" name="${toolName}" agent="${agent}"></skill>\n`;

            stepRecord.userMessage += skillMessageToSend;

            yield Message('', AgentMessageType.MESSAGE_START);
            yield Message(skillMessageToSend, AgentMessageType.MESSAGE_CHUNK);
            yield Message('', AgentMessageType.MESSAGE_END);
          }

          let result;
          try {
            // Log skill execution details
            logger.info(`Executing skill: ${skillName}`);
            logger.info(`Input parameters: ${JSON.stringify(skillInput)}`);

            if (!internalTools.includes(toolName)) {
              yield Message(
                JSON.stringify({ skillId, status: 'start' }),
                AgentMessageType.SKILL_START,
              );
            }

            // Handle SOL agent tools
            if (agent === 'sol') {
              if (toolName === 'load_mcp') {
                // Load MCP integration and update available tools
                await mcp.load(skillInput.integration, availableMCPServers);
                tools = {
                  ...tools,
                  ...(await mcp.allTools()),
                };
                result = 'MCP integration loaded successfully';
              } else if (toolName === 'see_file') {
                skillInput.files.forEach(
                  (file: { fileType: string; url: string }) => {
                    executionState.resources.push({
                      fileType: file.fileType,
                      publicURL: file.url,
                    });
                  },
                );
                result = 'File content added to resources';
              } else {
                // Execute standard SOL tool
                result = await callSolTool(skillName, skillInput);
                yield Message(
                  JSON.stringify({ result, skillId }),
                  AgentMessageType.SKILL_CHUNK,
                );
              }
            }
            // Handle Claude coding agent
            else if (agent === 'claude' && toolName === 'coding') {
              result = [];
              // Stream Claude code execution results
              for await (const step of claudeCode({
                workspaceId,
                userId,
                ...skillInput,
              })) {
                result.push(step);
                yield Message(
                  JSON.stringify({ ...step, skillId }),
                  AgentMessageType.SKILL_CHUNK,
                );
              }
            }

            // Handle other MCP tools
            else {
              result = await mcp.callTool(skillName, skillInput);

              yield Message(
                JSON.stringify({ result, skillId }),
                AgentMessageType.SKILL_CHUNK,
              );
            }

            yield Message(
              JSON.stringify({ skillId, status: 'end' }),
              AgentMessageType.SKILL_END,
            );

            stepRecord.skillOutput =
              typeof result === 'object'
                ? JSON.stringify(result, null, 2)
                : result;
            stepRecord.observation = stepRecord.skillOutput;
          } catch (e) {
            console.log(e);
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
