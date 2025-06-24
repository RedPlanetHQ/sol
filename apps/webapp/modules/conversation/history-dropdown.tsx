import {
  Button,
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  Popover,
  PopoverContent,
  PopoverTrigger,
  ScrollArea,
} from '@redplanethq/ui';
import { sort } from 'fast-sort';
import { HistoryIcon, MessageSquare } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';

import type { ConversationType } from 'common/types';

import { useApplication } from 'hooks/application';

import { useContextStore } from 'store/global-context-provider';

import { useConversationContext } from './use-conversation-context';

export const AIHistoryDropdown = observer(() => {
  const [open, setOpen] = React.useState(false);
  const { conversationsStore } = useContextStore();
  const { updateConversationId } = useApplication();

  const pageId = useConversationContext();
  const conversations = React.useMemo(() => {
    return sort(conversationsStore.conversations.filter((c) => !c.taskId)).desc(
      (conversation: ConversationType) => new Date(conversation.createdAt),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationsStore.conversations.length, pageId]);

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost">
            <HistoryIcon size={16} />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="end">
          <Command>
            <CommandInput placeholder="Search conversation..." autoFocus />
            <ScrollArea className="h-48 overflow-auto">
              <CommandGroup>
                {conversations.map((conversation: ConversationType) => (
                  <CommandItem
                    key={conversation.id}
                    value={conversation.id}
                    onSelect={() => {
                      updateConversationId(conversation.id);
                      setOpen(false);
                    }}
                  >
                    <div className="flex shrink min-w-[0px] w-full gap-1 items-center">
                      <MessageSquare size={16} className="shrink-0" />
                      <div className="truncate">{conversation.title}</div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </ScrollArea>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
});
