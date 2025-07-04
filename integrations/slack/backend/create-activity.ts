import { IntegrationAccount } from '@redplanethq/sol-sdk';
import axios from 'axios';

import { getUserDetails } from './utils';

async function getMessage(accessToken: string, channel: string, ts: string) {
  const result = await axios.get('https://slack.com/api/conversations.history', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    params: {
      channel,
      latest: ts,
      inclusive: true,
      limit: 1,
    },
  });

  return result.data.messages?.[0];
}

async function getConversationInfo(accessToken: string, channel: string) {
  const result = await axios.get('https://slack.com/api/conversations.info', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    params: {
      channel,
    },
  });

  return result.data.channel;
}

export const createActivityEvent = async (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  eventBody: any,
  integrationAccount: IntegrationAccount,
) => {
  const { eventData } = eventBody;
  if (eventData.event.type === 'message' && eventData.event.channel === 'D06UAK42494') {
    const event = eventData.event;

    const integrationConfiguration = integrationAccount.integrationConfiguration as Record<
      string,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      any
    >;

    if (!integrationConfiguration) {
      throw new Error('Integration configuration not found');
    }

    const accessToken = integrationConfiguration.access_token;

    const text = `DM with Sigma channel Content: '${event.text}'`;

    const permalinkResponse = await axios.get(
      `https://slack.com/api/chat.getPermalink?channel=${event.channel}&message_ts=${event.ts}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    const activity = {
      sourceURL: permalinkResponse.data.permalink,
      text,
      integrationAccountId: integrationAccount.id,
      taskId: null,
    };

    await axios.post('/api/v1/activity', activity);
  }

  // Only create activity for "eyes" reaction if the user who added the reaction is the integration user
  if (eventData.event.type === 'reaction_added' && eventData.event.reaction === 'eyes') {
    const event = eventData.event;

    const integrationConfiguration = integrationAccount.integrationConfiguration as Record<
      string,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      any
    >;
    if (!integrationConfiguration) {
      throw new Error('Integration configuration not found');
    }

    const accessToken = integrationConfiguration.access_token;
    const integrationUserId = integrationConfiguration.userId;
    // Only proceed if the user who added the reaction is the integration user
    if (event.user !== integrationUserId) {
      return {
        message: `Processed activity from slack (no action for non-integration user eye reaction)`,
      };
    }

    const channel = event.item.channel;
    const ts = event.item.ts;

    const eventMessage = await getMessage(accessToken, channel, ts);
    const mentionedUsers = getMentionUsers(eventMessage.text);

    const [userDetails, conversationInfo] = await Promise.all([
      getUserDetails([eventMessage.user, ...mentionedUsers], integrationConfiguration.access_token),
      getConversationInfo(accessToken, channel),
    ]);

    const userIdMap = new Map(userDetails.map((user) => [user.id, user]));

    const eventMessageText = eventMessage.text.replace(/<@U\w+>/g, (match: string) => {
      const userId = match.replace(/<@|>/g, '');
      const user = userIdMap.get(userId);
      return user ? `@${user.real_name}|${userId}` : match;
    });

    let conversationContext;
    if (conversationInfo.is_im) {
      const dmUser = userIdMap.get(conversationInfo.user);
      conversationContext = `direct message with ${dmUser?.real_name}(${conversationInfo.user})`;
    } else if (conversationInfo.is_group) {
      conversationContext = `private channel ${conversationInfo.name}(${conversationInfo.id})`;
    } else {
      conversationContext = `channel ${conversationInfo.name}(${conversationInfo.id})`;
    }

    // Change the activity text to reflect that "I" (the integration user) added the eye emoji
    const text = `I (user ${userIdMap.get(event.user)?.real_name || event.user}) added an :eyes: reaction in ${conversationContext} at ${eventMessage.ts}. Content: '${eventMessageText}'`;

    const permalinkResponse = await axios.get(
      `https://slack.com/api/chat.getPermalink?channel=${channel}&message_ts=${ts}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    const activity = {
      sourceURL: permalinkResponse.data.permalink,
      text,
      integrationAccountId: integrationAccount.id,
      taskId: null,
    };

    await axios.post('/api/v1/activity', activity);
  }
  return { message: `Processed activity from slack` };
};

function getMentionUsers(message: string): string[] {
  const mentionUsers = message.matchAll(/<@U\w+>/g);
  return Array.from(mentionUsers).map((match) => match[0].replace(/<@|>/g, ''));
}
