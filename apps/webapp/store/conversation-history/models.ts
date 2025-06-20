import { types } from 'mobx-state-tree';

import type { ConversationHistoryType } from 'common/types';

export const ConversationHistory = types.model({
  id: types.string,
  createdAt: types.string,
  updatedAt: types.string,
  message: types.string,
  context: types.union(types.null, types.string),
  thoughts: types.union(types.null, types.string),
  userId: types.union(types.null, types.string),
  activityId: types.union(types.null, types.string, types.undefined),
  userType: types.enumeration(['Agent', 'User', 'System']),
  conversationId: types.string,
});

export interface ConversationHistoryStoreType {
  conversationHistory: ConversationHistoryType[];
  getConversationHistoryForConversation: (
    id: string,
  ) => ConversationHistoryType[];
  getConversationHistoryForId: (id: string) => ConversationHistoryType;
  getConversationHistoryForActivity: (
    activityId: string,
  ) => ConversationHistoryType;
  update: (
    conversation: Partial<ConversationHistoryType>,
    id: string,
  ) => Promise<ConversationHistoryType>;
  load: () => Promise<void>;

  deleteById: (id: string) => Promise<void>;
}
