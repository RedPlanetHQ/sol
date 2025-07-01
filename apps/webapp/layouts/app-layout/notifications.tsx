import {
  Popover,
  Button,
  PopoverContent,
  PopoverTrigger,
  PopoverPortal,
  cn,
  NotificationLine,
  LoaderLine,
} from '@redplanethq/ui';
import { observer } from 'mobx-react-lite';
import React from 'react';

import { useApplication } from 'hooks/application';

import { TabViewType } from 'store/application';
import { useContextStore } from 'store/global-context-provider';

interface Conversation {
  id: string;
  title: string;
  unread: boolean;
  status: string;
}

interface NotificationSectionProps {
  title: string;
  items: Conversation[];
  onClickItem?: (id: string) => void;
}

const NotificationSection: React.FC<NotificationSectionProps> = React.memo(
  ({ title, items, onClickItem }) => {
    if (items.length === 0) {
      return null;
    }

    return (
      <div className="py-1">
        <div className="px-4 pb-1 text-sm text-muted-foreground">{title}</div>
        {items.map((item) => (
          <div
            key={item.id}
            className="mx-2 px-2 mb-0.5 flex gap-1 items-center hover:bg-grayAlpha-100 rounded cursor-pointer"
            onClick={() => onClickItem?.(item.id)}
          >
            <div className="flex flex-col gap-1 py-1.5 w-full">
              <div className="w-[100%]">
                <div className="truncate">{item.title}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  },
);

NotificationSection.displayName = 'NotificationSection';

export const Notifications = observer(() => {
  const [open, setOpen] = React.useState(false);
  const [runningOpen, setRunningOpen] = React.useState(false);
  const { conversationsStore } = useContextStore();
  const conversations = conversationsStore.conversations;
  const { changeActiveTab } = useApplication();

  // Split conversations by status
  const runningConversations = conversations.filter(
    (conv) => conv.status === 'running',
  );
  const notRunningConversations = conversations.filter(
    (conv) => conv.status !== 'running',
  );

  // Further categorize not running conversations
  const categorizedConversations = {
    unread: notRunningConversations.filter(
      (conv) => conv.unread && !conv.taskId,
    ),
    needApproval: notRunningConversations.filter(
      (conv) => conv.status === 'need_approval',
    ),
    needAttention: notRunningConversations.filter(
      (conv) => conv.status === 'need_attention',
    ),
  };

  const totalNotifications =
    categorizedConversations.unread.length +
    categorizedConversations.needApproval.length +
    categorizedConversations.needAttention.length;

  const totalRunning = runningConversations.length;

  const handleConversationClick = (id: string) => {
    changeActiveTab(TabViewType.ASSISTANT, {
      conversationId: id,
    });
    setOpen(false);
    setRunningOpen(false);
  };

  return (
    <div className="flex gap-0.5">
      {/* Not running conversations popover */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="secondary"
            className={cn(
              'gap-1 items-center',
              totalNotifications > 0 && 'bg-primary text-white',
              open && '!bg-background-3 shadow !text-foreground ',
            )}
          >
            <NotificationLine size={16} />
            {totalNotifications > 0 ? `${totalNotifications}` : ''}
          </Button>
        </PopoverTrigger>
        <PopoverPortal>
          <PopoverContent className="w-72 px-0 pt-2 pb-0" align="end">
            {totalNotifications === 0 ? (
              <div className="p-3 pt-1 flex items-center">No conversations</div>
            ) : (
              <>
                <NotificationSection
                  title="Unread"
                  items={categorizedConversations.unread}
                  onClickItem={handleConversationClick}
                />
                <NotificationSection
                  title="Need Approval"
                  items={categorizedConversations.needApproval}
                  onClickItem={handleConversationClick}
                />
                <NotificationSection
                  title="Need Attention"
                  items={categorizedConversations.needAttention}
                  onClickItem={handleConversationClick}
                />
              </>
            )}
          </PopoverContent>
        </PopoverPortal>
      </Popover>

      {/* Running conversations popover */}
      {totalRunning > 0 && (
        <Popover open={runningOpen} onOpenChange={setRunningOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="secondary"
              className={cn(
                'gap-1 items-center',
                totalRunning > 0 && 'bg-background-3 shadow text-foreground',
              )}
              disabled={totalRunning === 0}
            >
              <LoaderLine size={16} className="mr-1 animate-spin" />
              {totalRunning > 0 ? `${totalRunning}` : ''}
            </Button>
          </PopoverTrigger>
          <PopoverPortal>
            <PopoverContent className="w-72 px-0 pt-2 pb-0" align="end">
              {totalRunning === 0 ? (
                <div className="p-3 pt-1 flex items-center">
                  No running conversations
                </div>
              ) : (
                <NotificationSection
                  title="Running"
                  items={runningConversations}
                  onClickItem={handleConversationClick}
                />
              )}
            </PopoverContent>
          </PopoverPortal>
        </Popover>
      )}
    </div>
  );
});
