import { useToast } from '@redplanethq/ui';
import { observer } from 'mobx-react-lite';
import React from 'react';

import type { Resource } from 'modules/conversation/resource';

import { useApplication } from 'hooks/application';

import { useCreateConversationMutation } from 'services/conversations';
import { useGetIntegrationDefinitions } from 'services/integration-definition';

import { useContextStore } from 'store/global-context-provider';
import { UserContext } from 'store/user-context';

import { AssistantEditor } from './assistant-editor';
import { TodayView } from './today-view';
import { getTasksForToday } from './utils';

export const NewConversation = observer(() => {
  const { taskOccurrencesStore } = useContextStore();
  const { updateConversationId } = useApplication();
  const { toast } = useToast();

  const user = React.useContext(UserContext);

  const { isLoading } = useGetIntegrationDefinitions();
  const { mutate: createConversation, isLoading: createConversationLoading } =
    useCreateConversationMutation({});
  const taskIds = getTasksForToday(taskOccurrencesStore);

  if (isLoading) {
    return null;
  }

  const onSend = (text: string, title: string, resources: Resource[]) => {
    createConversation(
      {
        message: text,
        context: {
          agents: [],
          resources: resources.map((res) => res.publicURL),
        },
        title,
      },
      {
        onSuccess: (data) => {
          updateConversationId(data.conversationId);
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

  return (
    <div className="flex flex-col h-full justify-start w-full items-start p-4 overflow-y-auto">
      <div className="flex flex-col w-full items-center">
        <div className="max-w-[90ch] w-full">
          <h1 className="text-[32px] mx-1 font-medium text-left mb-4">
            Hello <span className="text-primary">{user.fullname}</span>
          </h1>

          <AssistantEditor
            onSend={onSend}
            placeholder="Search or Ask sol..."
            isLoading={createConversationLoading}
          />

          {taskIds && (
            <div className="mt-4">
              <TodayView taskIds={taskIds} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
