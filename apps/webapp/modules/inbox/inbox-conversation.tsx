import { Button, useToast } from '@redplanethq/ui';
import { sort } from 'fast-sort';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { Key } from 'ts-key-enum';

import { ConversationItem } from 'modules/conversation/conversation-item';
import { ConversationTextarea } from 'modules/conversation/conversation-textarea';
import type { Resource } from 'modules/conversation/resource';
import { StreamingConversation } from 'modules/conversation/streaming-conversation';
import { useConversationRead } from 'modules/conversation/use-conversation-read';

import { SCOPES } from 'common/shortcut-scopes';
import type { ConversationHistoryType } from 'common/types';
import { ScrollAreaWithAutoScroll } from 'common/use-auto-scroll';

import { useApplication } from 'hooks/application';
import { useConversationHistory } from 'hooks/conversations';
import { useScope } from 'hooks/use-scope';

import {
  useCreateConversationMutation,
  useGetCurrentConversationRun,
} from 'services/conversations';
import { useApproveOrDeclineMutation } from 'services/conversations/approve-or-decline';

import { useContextStore } from 'store/global-context-provider';

interface InboxConversationProps {
  conversationId: string;
}

export const InboxConversation = observer(
  ({ conversationId }: InboxConversationProps) => {
    useScope(SCOPES.AI);

    const { conversationsStore } = useContextStore();
    const conversation =
      conversationsStore.getConversationWithId(conversationId);
    const [conversationResponse, setConversationResponse] =
      React.useState(undefined);
    const { data: initialRunResponse } =
      useGetCurrentConversationRun(conversationId);
    const { updateConversationId } = useApplication();

    const { mutate: createConversation } = useCreateConversationMutation({});
    const { toast } = useToast();

    const { conversationHistory } = useConversationHistory(conversation?.id);
    useConversationRead(conversationId);
    const { mutate: approval, isLoading } = useApproveOrDeclineMutation({});

    React.useEffect(() => {
      if (initialRunResponse) {
        setConversationResponse(initialRunResponse);
      }
    }, [initialRunResponse]);

    useHotkeys(
      Key.Escape,
      () => {
        updateConversationId(undefined);
      },
      { scopes: [SCOPES.ASSISTANT] },
    );

    const onSend = (
      text: string,
      agents: string[],
      title: string,
      resources: Resource[],
    ) => {
      if (!!conversationResponse || conversation?.status === 'running') {
        return;
      }

      createConversation(
        {
          message: text,
          context: { agents, resources: resources.map((res) => res.publicURL) },
          title,
          conversationId: conversation?.id,
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

    return (
      <div className="relative flex flex-col h-full justify-center w-full items-center overflow-auto">
        <div className="flex flex-col justify-end overflow-hidden h-full w-full">
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

          <div className="flex flex-col w-full items-center">
            <div className="max-w-[97ch] w-full px-1 pr-2">
              {conversation?.status !== 'need_approval' && (
                <ConversationTextarea
                  onSend={onSend}
                  className="bg-background-3 w-full border-gray-300 border-1"
                  isLoading={
                    !!conversationResponse || conversation?.status === 'running'
                  }
                />
              )}
            </div>
          </div>
        </div>
      </div>
    );
  },
);
