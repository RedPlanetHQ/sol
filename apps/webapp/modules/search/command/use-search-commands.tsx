import {
  AddLine,
  AI,
  CalendarLine,
  DeleteLine,
  Fire,
  IssuesLine,
  Project,
  SettingsLine,
} from '@redplanethq/ui';
import { Brain, Check, Settings, Workflow } from 'lucide-react';
import React from 'react';

import { DailogViewsContext, DialogType } from 'modules/dialog-views-provider';
import { useSettings } from 'modules/settings';

import { useApplication } from 'hooks/application';
import { useIPC } from 'hooks/ipc';

import { useCreateTaskMutation } from 'services/tasks';

import { TabViewType } from 'store/application';
import { useContextStore } from 'store/global-context-provider';

import { useTaskOperations } from './use-task-operations';

interface CommandType {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Icon: any;
  text: string | React.ReactNode;
  shortcut?: string;
  command: () => void;
}

export const useSearchCommands = (
  value: string,
  onClose: () => void,
  strict?: boolean,
  quickWindow?: boolean,
) => {
  const { tasksStore, pagesStore, listsStore } = useContextStore();
  const { changeActiveTab, selectedTasks, activeTab } = useApplication();
  const ipc = useIPC();
  const { openDialog } = React.useContext(DailogViewsContext);
  const { markComplete, deleteTasks } = useTaskOperations();
  const { openSettings } = useSettings();
  const { mutate: createTask } = useCreateTaskMutation({});

  const getTasks = () => {
    if (selectedTasks.length > 0) {
      return selectedTasks;
    }

    return [];
  };

  return React.useMemo(() => {
    const commands: Record<string, CommandType[]> = {};

    commands['default'] = [
      {
        Icon: CalendarLine,
        text: 'Home',
        command: () => {
          changeActiveTab(TabViewType.ASSISTANT, {
            data: {
              date: new Date(),
            },
          });

          onClose();
        },
      },
      {
        Icon: IssuesLine,
        text: 'Go to tasks',
        command: () => {
          changeActiveTab(TabViewType.MY_TASKS, {});

          onClose();
        },
      },
      {
        Icon: Project,
        text: 'Go to lists',
        command: () => {
          changeActiveTab(TabViewType.LIST, {});

          onClose();
        },
      },
      {
        Icon: SettingsLine,
        text: 'Go to settings',
        command: () => {
          openSettings();
          onClose();
        },
      },
    ];

    if (value) {
      commands['create_tasks'] = [
        {
          Icon: AddLine,
          text: (
            <>
              {value} - <span className="text-muted-foreground">Task</span>
            </>
          ),
          command: () => {
            createTask(
              {
                status: 'Todo',
                title: value,
              },
              {
                onSuccess: () => {},
              },
            );

            onClose();
          },
        },
      ];
    }

    if (value) {
      commands['settings'] = [
        {
          Icon: Workflow,
          text: 'Automations',
          command: () => {
            openSettings('Automations');
            onClose();
          },
        },
        {
          Icon: Brain,
          text: 'Memory',
          command: () => {
            openSettings('Memory');
            onClose();
          },
        },
        {
          Icon: AI,
          text: 'MCP',
          command: () => {
            openSettings('MCP');
            onClose();
          },
        },
        {
          Icon: Settings,
          text: 'History',
          command: () => {
            openSettings('History');
            onClose();
          },
        },
      ];
    }

    if (
      activeTab.type === TabViewType.MY_TASKS &&
      (getTasks().length > 0 || activeTab.entity_id)
    ) {
      commands['Task'] = [
        {
          Icon: CalendarLine,
          text: 'Schedule',
          shortcut: 's',
          command: () => {
            onClose();
            openDialog(DialogType.SCHEDULE);
          },
        },
        {
          Icon: Fire,
          text: 'Set due date',
          shortcut: 'd',
          command: () => {
            onClose();
            openDialog(DialogType.DUEDATE);
          },
        },
        {
          Icon: Check,
          text: 'Mark completed',
          shortcut: 'c',
          command: () => {
            onClose();
            markComplete(getTasks());
          },
        },
        {
          Icon: DeleteLine,
          text: 'Delete task',
          shortcut: 'cmd + ⌫',
          command: () => {
            onClose();
            deleteTasks(getTasks());
          },
        },
      ];
    }

    if (value) {
      const pages = pagesStore.searchPages(value, strict);

      commands['Pages'] = pages
        .map((page) => {
          const task = tasksStore.getTaskForPage(page.id);
          const list = listsStore.getListWithPageId(page.id);

          if (task) {
            return {
              Icon: IssuesLine,
              text: page.title,
              key: task.id,
              command: () => {
                if (quickWindow && ipc) {
                  ipc.sendToMain({ type: TabViewType.MY_TASKS, id: task.id });
                  return;
                }

                changeActiveTab(TabViewType.MY_TASKS, {
                  entityId: task.id,
                });

                onClose();
              },
            };
          }

          if (list) {
            return {
              Icon: Project,
              text: page.title,
              key: list.id,
              command: () => {
                if (quickWindow && ipc) {
                  ipc.sendToMain({ type: TabViewType.LIST, id: list.id });
                  return;
                }

                changeActiveTab(TabViewType.LIST, {
                  entityId: list.id,
                });

                onClose();
              },
            };
          }

          return undefined;
        })
        .filter(Boolean);
    }

    return commands;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
};
