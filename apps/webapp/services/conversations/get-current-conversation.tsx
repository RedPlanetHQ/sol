import axios from 'axios';
import { type UseQueryResult, useQuery } from 'react-query';

import { type XHRErrorResponse } from 'services/utils';

const getCurrentConversationRun = async (conversationId: string) => {
  if (!conversationId) {
    return undefined;
  }

  const response = await axios(`/api/v1/conversation/${conversationId}/run`);

  return response.data;
};

/**
 * Query Key for Get conversation history.
 */
const GetCurrentConversationRun = 'getCurrentConversationRun';

export function useGetCurrentConversationRun(
  conversationId: string,
): UseQueryResult<{ id: string; token: string }, XHRErrorResponse> {
  return useQuery(
    [GetCurrentConversationRun, conversationId],
    async () => await getCurrentConversationRun(conversationId),
    {
      retry: 1,
      staleTime: 1000000,
      refetchOnWindowFocus: false, // Frequency of Change would be Low
    },
  );
}
