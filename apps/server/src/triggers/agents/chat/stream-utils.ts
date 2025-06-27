import fs from 'fs';
import path from 'node:path';

import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { openai } from '@ai-sdk/openai';
import { logger } from '@trigger.dev/sdk/v3';
import { CoreMessage, LanguageModelV1, streamText, ToolSet } from 'ai';
import { createOllama } from 'ollama-ai-provider';

import { AgentMessageType, Message } from './types';

interface State {
  inTag: boolean;
  messageEnded: boolean;
  message: string;
  lastSent: string;
}

export interface ExecutionState {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  agentFlow: any;
  userMessage: string;
  message: string;
}

export async function* processTag(
  state: State,
  totalMessage: string,
  chunk: string,
  startTag: string,
  endTag: string,
  states: { start: string; chunk: string; end: string },
  extraParams: Record<string, string> = {},
) {
  let comingFromStart = false;

  if (!state.messageEnded) {
    if (!state.inTag) {
      const startIndex = totalMessage.indexOf(startTag);
      if (startIndex !== -1) {
        state.inTag = true;
        // Send MESSAGE_START when we first enter the tag
        yield Message('', states.start as AgentMessageType, extraParams);
        const chunkToSend = totalMessage.slice(startIndex + startTag.length);
        state.message += chunkToSend;
        comingFromStart = true;
      }
    }

    if (state.inTag) {
      // Check if chunk contains end tag
      const hasEndTag = chunk.includes(endTag);
      const hasStartTag = chunk.includes(startTag);
      const hasClosingTag = chunk.includes('</');

      if (hasClosingTag && !hasStartTag && !hasEndTag) {
        // If chunk only has </ but not the full end tag, accumulate it
        state.message += chunk;
      } else if (hasEndTag || (!hasEndTag && !hasClosingTag)) {
        let currentMessage = comingFromStart
          ? state.message
          : state.message + chunk;

        const endIndex = currentMessage.indexOf(endTag);

        if (endIndex !== -1) {
          // For the final chunk before the end tag
          currentMessage = currentMessage.slice(0, endIndex).trim();
          const messageToSend = currentMessage.slice(
            currentMessage.indexOf(state.lastSent) + state.lastSent.length,
          );

          if (messageToSend) {
            yield Message(
              messageToSend,
              states.chunk as AgentMessageType,
              extraParams,
            );
          }
          // Send MESSAGE_END when we reach the end tag
          yield Message('', states.end as AgentMessageType, extraParams);

          state.message = currentMessage;
          state.messageEnded = true;
        } else {
          const diff = currentMessage.slice(
            currentMessage.indexOf(state.lastSent) + state.lastSent.length,
          );

          // For chunks in between start and end
          const messageToSend = comingFromStart ? state.message : diff;

          if (messageToSend) {
            state.lastSent = messageToSend;
            yield Message(
              messageToSend,
              states.chunk as AgentMessageType,
              extraParams,
            );
          }
        }

        state.message = currentMessage;
        state.lastSent = state.message;
      } else {
        state.message += chunk;
      }
    }
  }
}

export async function* generate(
  messages: CoreMessage[],
  isProgressUpdate: boolean = false,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onFinish?: (event: any) => void,
  tools?: ToolSet,
  system?: string,
  model?: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): AsyncGenerator<
  | string
  | {
      type: string;
      toolName: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      args?: any;
      toolCallId?: string;
      message?: string;
    }
> {
  // Check for API keys
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const googleKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const ollamaUrl = process.env.OLLAMA_URL;
  model = model || process.env.MODEL;

  let modelInstance;
  let modelTemperature = Number(process.env.MODEL_TEMPERATURE) || 1;

  // First check if Ollama URL exists and use Ollama
  if (ollamaUrl) {
    const ollama = createOllama({
      baseURL: ollamaUrl,
    });
    modelInstance = ollama(model || 'llama2'); // Default to llama2 if no model specified
  } else {
    // If no Ollama, check other models
    switch (model) {
      case 'claude-3-7-sonnet-20250219':
      case 'claude-3-opus-20240229':
      case 'claude-3-5-haiku-20241022':
        if (!anthropicKey) {
          throw new Error('No Anthropic API key found. Set ANTHROPIC_API_KEY');
        }
        modelInstance = anthropic(model);
        modelTemperature = 0.5;
        break;

      case 'gemini-2.5-flash-preview-04-17':
      case 'gemini-2.5-pro-preview-03-25':
      case 'gemini-2.0-flash':
      case 'gemini-2.0-flash-lite':
        if (!googleKey) {
          throw new Error('No Google API key found. Set GOOGLE_API_KEY');
        }
        modelInstance = google(model);
        break;

      case 'gpt-4.1-2025-04-14':
      case 'gpt-4.1-mini-2025-04-14':
      case 'gpt-4.1-nano-2025-04-14':
        if (!openaiKey) {
          throw new Error('No OpenAI API key found. Set OPENAI_API_KEY');
        }
        modelInstance = openai(model);
        break;

      default:
        break;
    }
  }

  logger.info('starting stream');
  // Try Anthropic next if key exists
  if (modelInstance) {
    try {
      const { textStream, fullStream } = streamText({
        model: modelInstance as LanguageModelV1,
        messages,
        temperature: modelTemperature,
        maxSteps: 10,
        tools,
        ...(isProgressUpdate
          ? { toolChoice: { type: 'tool', toolName: 'sol--progress_update' } }
          : {}),
        toolCallStreaming: true,
        onFinish,
        ...(system ? { system } : {}),
      });

      for await (const chunk of textStream) {
        yield chunk;
      }

      for await (const fullChunk of fullStream) {
        if (fullChunk.type === 'tool-call') {
          yield {
            type: 'tool-call',
            toolName: fullChunk.toolName,
            toolCallId: fullChunk.toolCallId,
            args: fullChunk.args,
          };
        }

        if (fullChunk.type === 'error') {
          // Log the error to a file
          const errorLogsDir = path.join(__dirname, '../../../../logs/errors');

          // Ensure the directory exists
          try {
            if (!fs.existsSync(errorLogsDir)) {
              fs.mkdirSync(errorLogsDir, { recursive: true });
            }

            // Create a timestamped error log file
            const timestamp = new Date().toISOString().replace(/:/g, '-');
            const errorLogPath = path.join(
              errorLogsDir,
              `llm-error-${timestamp}.json`,
            );

            // Write the error to the file
            fs.writeFileSync(
              errorLogPath,
              JSON.stringify({
                timestamp: new Date().toISOString(),
                error: fullChunk.error,
              }),
            );

            logger.error(`LLM error logged to ${errorLogPath}`);
          } catch (err) {
            logger.error(`Failed to log LLM error: ${err}`);
          }
        }
      }
      return;
    } catch (e) {
      console.log(e);
      logger.error(e);
    }
  }

  throw new Error('No valid LLM configuration found');
}
