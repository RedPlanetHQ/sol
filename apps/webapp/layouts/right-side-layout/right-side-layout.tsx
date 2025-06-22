import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@redplanethq/ui';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { Key } from 'ts-key-enum';

import { Conversation } from 'modules/conversation';
import { SearchDialog } from 'modules/search';

import { SCOPES } from 'common/shortcut-scopes';
import { useLocalCommonState } from 'common/use-local-state';

import { useApplication } from 'hooks/application';
import { useScope } from 'hooks/use-scope';

import { TabViewType } from 'store/application';
import { TabContext } from 'store/tab-context';

import { RightSideHeader } from './right-side-header';

interface RightSideLayoutProps {
  children: React.ReactNode;
}

export interface ContextType {
  collapsed: boolean;
  onOpen: () => void;
  onClose: () => void;
}

export const RightSideViewContext = React.createContext<ContextType>(undefined);

export const RightSideLayout = observer(
  ({ children }: RightSideLayoutProps) => {
    useScope(SCOPES.AI);

    const [size, setSize] = useLocalCommonState('panelSize', 15);

    const [rightSideCollapsed, setRightSideCollapsed] = React.useState(true);

    const { activeTab } = useApplication();

    useHotkeys(
      [Key.Escape],
      () => {
        setRightSideCollapsed(true);
      },
      {
        scopes: [SCOPES.AI],
        enableOnFormTags: true,
        enableOnContentEditable: true,
      },
    );

    React.useEffect(() => {
      if (activeTab.type === TabViewType.ASSISTANT && !rightSideCollapsed) {
        setRightSideCollapsed(true);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab.type, activeTab.entity_id]);

    useHotkeys(
      [`${Key.Meta}+l`],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (event) => {
        switch (event.key) {
          case 'l':
            if (activeTab.type === TabViewType.ASSISTANT) {
              return;
            }

            if (event.metaKey) {
              if (rightSideCollapsed) {
                setRightSideCollapsed(false);
              } else {
                onClose();
              }
            }
            break;
          default:
            break;
        }
      },
      {
        scopes: [SCOPES.Global],
        enableOnFormTags: true,
        enableOnContentEditable: true,
      },
    );

    const onClose = () => {
      setRightSideCollapsed(true);
    };

    const onOpen = () => {
      setRightSideCollapsed(false);
    };

    return (
      <RightSideViewContext.Provider
        value={{
          collapsed: rightSideCollapsed,
          onOpen,
          onClose,
        }}
      >
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel
            collapsible={false}
            className="rounded-md"
            order={1}
            id="home"
          >
            <TabContext.Provider value={{ tabId: activeTab.id }}>
              {children}
            </TabContext.Provider>
          </ResizablePanel>
          {!rightSideCollapsed && (
            <>
              <ResizableHandle className="w-1" />

              <ResizablePanel
                className="bg-background pl-2"
                collapsible={false}
                maxSize={50}
                minSize={25}
                defaultSize={size}
                onResize={(size) => setSize(size)}
                order={2}
                id="rightScreen"
              >
                <RightSideHeader onClose={onClose} />
                <Conversation />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>

        <SearchDialog />
      </RightSideViewContext.Provider>
    );
  },
);
