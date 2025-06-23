import { sort } from 'fast-sort';
import React from 'react';

import type { ConversationHistoryType } from 'common/types';

import { useContextStore } from 'store/global-context-provider';

export const useConversationHistory = (conversationId: string) => {
  const { conversationHistoryStore, conversationsStore } = useContextStore();
  const conversation = conversationsStore.getConversationWithId(conversationId);

  return React.useMemo(() => {
    const conversationHistory =
      conversationHistoryStore.getConversationHistoryForConversation(
        conversationId,
      );
    return {
      conversationHistory: sort(conversationHistory).asc(
        (co: ConversationHistoryType) => new Date(co.createdAt),
      ) as ConversationHistoryType[],
      conversation,
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, conversationHistoryStore.conversationHistory.length]);
};
