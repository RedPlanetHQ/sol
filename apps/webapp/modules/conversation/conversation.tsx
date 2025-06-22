import type { Resource } from './resource';

import { Button, Loader, useToast } from '@redplanethq/ui';
import { sort } from 'fast-sort';
import { observer } from 'mobx-react-lite';
import React from 'react';

import type { ConversationHistoryType } from 'common/types';
import { ScrollAreaWithAutoScroll } from 'common/use-auto-scroll';

import { useApplication } from 'hooks/application';
import { useConversationHistory } from 'hooks/conversations';

import {
  useCreateConversationMutation,
  useGetCurrentConversationRun,
} from 'services/conversations';
import { useApproveOrDeclineMutation } from 'services/conversations/approve-or-decline';
import { useGetIntegrationDefinitions } from 'services/integration-definition';

import { useContextStore } from 'store/global-context-provider';

import { ConversationItem } from './conversation-item';
import { ConversationTextarea } from './conversation-textarea';
import { StreamingConversation } from './streaming-conversation';
import { useConversationContext } from './use-conversation-context';
import { useConversationRead } from './use-conversation-read';

export const Conversation = observer(() => {
  const { activeTab, updateConversationId } = useApplication();
  const { toast } = useToast();
  const { tasksStore, listsStore } = useContextStore();
  const { conversationHistory, conversation } = useConversationHistory(
    activeTab.conversation_id,
  );
  const { data: initialRunResponse } = useGetCurrentConversationRun(
    activeTab.conversation_id,
  );

  const { isLoading: integrationsLoading } = useGetIntegrationDefinitions();
  const pageId = useConversationContext();
  const task = tasksStore.getTaskForPage(pageId);
  const list = listsStore.getListWithPageId(pageId);
  useConversationRead(activeTab.conversation_id);

  const [conversationResponse, setConversationResponse] =
    React.useState(undefined);

  const { mutate: createConversation, isLoading: conversationLoading } =
    useCreateConversationMutation({});
  const { mutate: approval, isLoading } = useApproveOrDeclineMutation({});

  React.useEffect(() => {
    if (initialRunResponse) {
      setConversationResponse(initialRunResponse);
    }
  }, [initialRunResponse]);

  const onSend = (
    text: string,
    agents: string[],
    title: string,
    resources?: Resource[],
  ) => {
    if (!!conversationResponse || conversation?.status === 'running') {
      return;
    }

    createConversation(
      {
        message: text,
        context: { agents, resources: resources.map((res) => res.publicURL) },
        title,
        conversationId: activeTab.conversation_id,
      },
      {
        onSuccess: (data) => {
          updateConversationId(data.conversationId);
          setConversationResponse(data);
        },
        onError: (data) => {
          const errorMessage = data.response?.data?.message;
          toast({
            title: 'Conversation error',
            description: errorMessage ?? 'Conversation creation failed',
          });
        },
      },
    );
  };

  const sendApproval = (approved: boolean) => {
    approval(
      { approved, conversationId: conversation.id },
      {
        onSuccess: (data) => {
          updateConversationId(data.conversationId);
          setConversationResponse(data);
        },
      },
    );
  };

  const getConversations = () => {
    const lastConversationHistoryId =
      conversationResponse?.conversationHistoryId;

    // First sort the conversation history by creation time
    const sortedConversationHistory = sort(conversationHistory).asc(
      (ch) => ch.createdAt,
    );

    const lastIndex = sortedConversationHistory.findIndex(
      (item) => item.id === lastConversationHistoryId,
    );

    // Filter out any conversation history items that come after the lastConversationHistoryId
    const filteredConversationHistory = lastConversationHistoryId
      ? sortedConversationHistory.filter((_ch, currentIndex: number) => {
          // Find the index of the last conversation history

          // Only keep items that come before or are the last conversation history
          return currentIndex <= lastIndex;
        })
      : sortedConversationHistory;

    return (
      <>
        {filteredConversationHistory.map(
          (ch: ConversationHistoryType, index: number) => {
            return (
              <ConversationItem key={index} conversationHistoryId={ch.id} />
            );
          },
        )}
        {conversation?.status === 'need_approval' && (
          <div className="flex justify-start gap-2 mx-4">
            <Button
              variant="destructive"
              disabled={isLoading}
              onClick={() => sendApproval(false)}
            >
              Decline
            </Button>
            <Button
              variant="secondary"
              onClick={() => sendApproval(true)}
              disabled={isLoading}
            >
              Accept
            </Button>
          </div>
        )}
      </>
    );
  };
  if (integrationsLoading) {
    return <Loader />;
  }

  return (
    <div className="flex flex-col h-[calc(100vh_-_58px)] items-center pr-2">
      <div className="overflow-hidden w-full grow">
        <div className="flex flex-col h-full justify-start overflow-hidden">
          <ScrollAreaWithAutoScroll>
            {getConversations()}
            {conversationResponse && (
              <StreamingConversation
                runId={conversationResponse.id}
                token={conversationResponse.token}
                conversationHistoryId={
                  conversationResponse?.conversationHistoryId
                }
                afterStreaming={() => setConversationResponse(undefined)}
              />
            )}
          </ScrollAreaWithAutoScroll>

          <div className="flex flex-col">
            {conversation?.status !== 'need_approval' && (
              <ConversationTextarea
                onSend={onSend}
                defaultValue={
                  task
                    ? `<mention data-id='${task.id}' data-label='task'></mention>`
                    : list
                      ? `<mention data-id='${list.id}' data-label='list'></mention>`
                      : undefined
                }
                isLoading={conversationResponse || conversationLoading}
                className="bg-background-2"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
