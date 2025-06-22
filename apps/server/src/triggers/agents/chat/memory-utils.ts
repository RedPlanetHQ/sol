import { logger } from '@trigger.dev/sdk/v3';
import axios from 'axios';

export const addToMemory = async (
  conversationId: string,
  message: string,
  agentMessage: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  preferences: any,
  userName: string,
) => {
  const memoryHost = preferences.memory_host;
  const apiKey = preferences.memory_api_key;

  if (!memoryHost || !apiKey) {
    logger.error('Memory is not configured');
    return 'Memory is not configured';
  }

  const episodeBody = `user(${userName}): ${message}\nassistant: ${agentMessage}`;

  const response = await axios.post(
    `${memoryHost}/ingest`,
    {
      episodeBody,
      referenceTime: new Date().toISOString(),
      metadata: {
        type: 'Conversation',
      },
      source: 'sol',
      sessionId: conversationId,
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    },
  );

  return response.data;
};
