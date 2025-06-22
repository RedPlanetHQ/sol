import React from 'react';

interface ConversationContextInterface {
  conversationHistoryId: string;

  // Used just in streaming
  streaming?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  actionMessages?: Record<string, any>;
}

export const ConversationContext =
  React.createContext<ConversationContextInterface>(undefined);
