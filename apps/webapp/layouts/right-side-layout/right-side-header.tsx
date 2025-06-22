import {
  Button,
  Close,
  cn,
  Tabs,
  TabsList,
  TabsTrigger,
} from '@redplanethq/ui';
import { observer } from 'mobx-react-lite';
import React from 'react';

import { ConversationHeaderActions } from 'modules/conversation';

import { TooltipWrapper } from 'common/tooltip';

import { useApplication } from 'hooks/application';

import { TabViewType } from 'store/application';
import { useContextStore } from 'store/global-context-provider';

interface RightSideHeaderProps {
  onClose: () => void;
}

const TabsForTask = observer(() => {
  const { activeTab, updateConversationId } = useApplication();
  const { conversationsStore } = useContextStore();
  const taskId = activeTab.entity_id;
  const conversation = conversationsStore.getConversationForTask(taskId);

  const getValue = () => {
    if (conversation && activeTab.conversation_id === conversation?.id) {
      return 'activity';
    }

    return 'chat';
  };

  return (
    <>
      {conversation && (
        <Tabs className="h-7" value={getValue()}>
          <TabsList className="grid grid-cols-2 w-full bg-transparent p-0 h-7 pt-0.5">
            <TooltipWrapper tooltip="This space shows updates from integrations and assistant responses to important changes.">
              <TabsTrigger
                value="activity"
                className={cn(
                  'h-7 hover:bg-grayAlpha-100 mr-0.5',
                  conversation &&
                    activeTab.conversation_id === conversation?.id &&
                    '!bg-background-3 shadow',
                )}
                onClick={() => {
                  if (activeTab.conversation_id !== conversation.id) {
                    updateConversationId(conversation.id);
                  }
                }}
              >
                Task updates
              </TabsTrigger>
            </TooltipWrapper>

            <TooltipWrapper tooltip="Use this to ask questions or get help from your assistant.">
              <TabsTrigger
                value="chat"
                className={cn(
                  'h-7 hover:bg-grayAlpha-100 w-fit',
                  activeTab.conversation_id !== conversation?.id &&
                    '!bg-background-3 shadow',
                )}
                onClick={() => updateConversationId(undefined)}
              >
                Ask <span className="font-mono ml-1">SOL</span>
              </TabsTrigger>
            </TooltipWrapper>
          </TabsList>
        </Tabs>
      )}
    </>
  );
});

export const RightSideHeader = observer(({ onClose }: RightSideHeaderProps) => {
  const { activeTab } = useApplication();

  return (
    <header className="flex h-[48px] shrink-0 items-center justify-between gap-2">
      <div className="flex items-center justify-between gap-2 px-2 w-full">
        <div>
          {activeTab.entity_id && activeTab.type === TabViewType.MY_TASKS && (
            <TabsForTask />
          )}
        </div>

        <div className="flex items-center">
          <ConversationHeaderActions />
          <Button variant="ghost" onClick={onClose}>
            <Close size={16} />
          </Button>
        </div>
      </div>
    </header>
  );
});
