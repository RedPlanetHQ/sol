import {
  Popover,
  Button,
  PopoverContent,
  PopoverTrigger,
  PopoverPortal,
  cn,
  NotificationLine,
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
}

const NotificationSection: React.FC<NotificationSectionProps> = React.memo(
  ({ title, items }) => {
    const { changeActiveTab } = useApplication();

    if (items.length === 0) {
      return null;
    }

    const onClick = (id: string) => {
      changeActiveTab(TabViewType.ASSISTANT, {
        conversationId: id,
      });
    };

    return (
      <div className="py-1">
        <div className="px-4 pb-1 text-sm text-muted-foreground">{title}</div>
        {items.map((item) => (
          <div
            key={item.id}
            className="mx-2 px-2 mb-0.5 flex gap-1 items-center hover:bg-grayAlpha-100 rounded cursor-pointer"
            onClick={() => onClick(item.id)}
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
  const { conversationsStore } = useContextStore();

  const categorizedConversations = React.useMemo(() => {
    const conversations = conversationsStore.conversations;
    return {
      unread: conversations.filter((conv) => conv.unread),
      needApproval: conversations.filter(
        (conv) => conv.status === 'need_approval',
      ),
      needAttention: conversations.filter(
        (conv) => conv.status === 'need_attention',
      ),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationsStore.conversations.length]);

  const totalNotifications = React.useMemo(
    () =>
      categorizedConversations.unread.length ||
      categorizedConversations.needApproval.length,
    [categorizedConversations],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="secondary"
          className={cn(
            'gap-1 items-center h-7',
            open && '!bg-background-3 shadow',
          )}
        >
          <NotificationLine size={16} />
          {totalNotifications}
        </Button>
      </PopoverTrigger>
      <PopoverPortal>
        <PopoverContent className="w-72 px-0 pt-2 pb-0" align="end">
          {totalNotifications === 0 ? (
            <div className="p-3 pt-1 flex items-center"> No notifications </div>
          ) : (
            <>
              <NotificationSection
                title="Unread"
                items={categorizedConversations.unread}
              />
              <NotificationSection
                title="Need Approval"
                items={categorizedConversations.needApproval}
              />
            </>
          )}
        </PopoverContent>
      </PopoverPortal>
    </Popover>
  );
});
