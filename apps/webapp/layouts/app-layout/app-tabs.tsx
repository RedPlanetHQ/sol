import { Button, cn, Inbox, IssuesLine, Project } from '@redplanethq/ui';
import { MessageSquare } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useHotkeys } from 'react-hotkeys-hook';

import { AIThinking } from 'modules/ai-thinking';

import { SCOPES } from 'common/shortcut-scopes';
import { TooltipWrapper } from 'common/tooltip';
import { RightSideViewContext } from 'layouts/right-side-layout';

import { useApplication } from 'hooks/application';

import { TabViewType } from 'store/application';

import { Notifications } from './notifications';
import { WorkspaceDropdown } from './workspace-dropdown';

export const AppTabs = observer(() => {
  const { activeTab, changeActiveTab } = useApplication();
  const { collapsed, onOpen, onClose } = React.useContext(RightSideViewContext);

  // Use a ref to track if 'g' was pressedAdd commentMore actions
  const gKeyPressed = React.useRef(false);
  const gKeyTimeout = React.useRef<NodeJS.Timeout | null>(null);

  // Handle the 'g' key pressAdd commentMore actions
  useHotkeys(
    'g',
    () => {
      gKeyPressed.current = true;

      // Reset the g key state after a short delay
      if (gKeyTimeout.current) {
        clearTimeout(gKeyTimeout.current);
      }

      gKeyTimeout.current = setTimeout(() => {
        gKeyPressed.current = false;
      }, 1000); // Reset after 1 second
    },
    {
      scopes: [SCOPES.Global],
      keyup: false,
      keydown: true,
    },
  );

  useHotkeys(
    ['h', 't', 'l'],
    (event) => {
      if (gKeyPressed.current) {
        switch (event.key) {
          case 'h':
            changeActiveTab(TabViewType.ASSISTANT, {});
            break;
          case 't':
            changeActiveTab(TabViewType.MY_TASKS, {});
            break;
          case 'l':
            changeActiveTab(TabViewType.LIST, {});
            break;
        }
        gKeyPressed.current = false;
        if (gKeyTimeout.current) {
          clearTimeout(gKeyTimeout.current);
        }
      }
    },
    {
      scopes: [SCOPES.Global],
    },
  );

  const goTo = (type: TabViewType) => {
    changeActiveTab(type, {});
  };

  return (
    <div className="tabs-list rounded-none flex gap-2 w-full items-center pt-1">
      <div className="flex rounded-md items-center px-3 h-11 grow gap-0.5">
        <WorkspaceDropdown />
        <TooltipWrapper tooltip="G then H">
          <Button
            variant="secondary"
            onClick={() => goTo(TabViewType.ASSISTANT)}
            className={cn(
              'gap-1 ml-1.5',
              activeTab.type === TabViewType.ASSISTANT &&
                '!bg-background-3 shadow',
            )}
          >
            <Inbox size={20} /> Home
          </Button>
        </TooltipWrapper>
        <TooltipWrapper tooltip="G then T">
          <Button
            variant="secondary"
            onClick={() => goTo(TabViewType.MY_TASKS)}
            className={cn(
              'gap-1',
              activeTab.type === TabViewType.MY_TASKS &&
                '!bg-background-3 shadow',
            )}
          >
            <IssuesLine size={18} /> Tasks
          </Button>
        </TooltipWrapper>
        <TooltipWrapper tooltip="G then L">
          <Button
            variant="secondary"
            onClick={() => goTo(TabViewType.LIST)}
            className={cn(
              'gap-1',
              activeTab.type === TabViewType.LIST && '!bg-background-3 shadow',
            )}
          >
            <Project size={18} /> List
          </Button>
        </TooltipWrapper>
      </div>

      <div className="flex gap-0.5 mr-2">
        <AIThinking />
        <Notifications />
        {activeTab.type !== TabViewType.ASSISTANT && (
          <Button
            variant="secondary"
            className={cn(
              'gap-1 items-center h-7',
              !collapsed && '!bg-background-3 shadow',
            )}
            onClick={() => (collapsed ? onOpen() : onClose())}
          >
            <MessageSquare size={16} />
          </Button>
        )}
      </div>
    </div>
  );
});
