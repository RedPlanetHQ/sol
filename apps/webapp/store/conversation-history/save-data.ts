import type { ConversationHistoryStoreType } from './models';

import type { SyncActionRecord } from 'common/types';

import { solDatabase } from 'store/database';

export async function saveConversationHistorytData(
  data: SyncActionRecord[],
  conversationHistoryStore: ConversationHistoryStoreType,
) {
  await Promise.all(
    data.map(async (record: SyncActionRecord) => {
      const conversationHistory = {
        id: record.data.id,
        createdAt: record.data.createdAt,
        updatedAt: record.data.updatedAt,
        message: record.data.message,
        context: JSON.stringify(record.data.context),
        thoughts: JSON.stringify(record.data.thoughts),
        userId: record.data.userId,
        userType: record.data.userType,
        conversationId: record.data.conversationId,
        activityId: record.data.activityId,
      };

      switch (record.action) {
        case 'I': {
          await solDatabase.conversationHistory.put(conversationHistory);
          return (
            conversationHistoryStore &&
            (await conversationHistoryStore.update(
              conversationHistory,
              record.data.id,
            ))
          );
        }

        case 'U': {
          await solDatabase.conversationHistory.put(conversationHistory);
          return (
            conversationHistoryStore &&
            (await conversationHistoryStore.update(
              conversationHistory,
              record.data.id,
            ))
          );
        }

        case 'D': {
          await solDatabase.conversationHistory.delete(record.data.id);
          return (
            conversationHistoryStore &&
            (await conversationHistoryStore.deleteById(record.data.id))
          );
        }
      }
    }),
  );
}
