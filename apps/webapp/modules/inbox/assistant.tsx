import { cn } from '@redplanethq/ui';
import { observer } from 'mobx-react-lite';
import React from 'react';

import { SCOPES } from 'common/shortcut-scopes';

import { useApplication } from 'hooks/application';
import { useScope } from 'hooks/use-scope';

import { useGetIntegrationDefinitions } from 'services/integration-definition';

import { InboxConversation } from './inbox-conversation';
import { NewConversation } from './new-conversation';

export const Assistant = observer(() => {
  useScope(SCOPES.ASSISTANT);

  const { activeTab } = useApplication();
  const { isLoading } = useGetIntegrationDefinitions();

  if (isLoading) {
    return null;
  }

  return (
    <div className={cn('h-[calc(100vh_-_60px)] flex flex-col')}>
      {activeTab.conversation_id ? (
        <InboxConversation conversationId={activeTab.conversation_id} />
      ) : (
        <NewConversation />
      )}
    </div>
  );
});
