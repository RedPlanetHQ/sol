import { Badge, Checkbox, cn } from '@redplanethq/ui';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useHotkeys } from 'react-hotkeys-hook';

import { SCOPES } from 'common/shortcut-scopes';
import { TooltipWrapper } from 'common/tooltip';

import { useApplication } from 'hooks/application';

import { useUpdateSingleTaskOccurrenceMutation } from 'services/task-occurrence';
import { useUpdateTaskMutation } from 'services/tasks';

import { TabViewType } from 'store/application';
import { useContextStore } from 'store/global-context-provider';

import { TaskInfo } from './task-info';

interface TaskListItemProps {
  taskId: string;
  minimal?: boolean;
}

export const TaskListItem = observer(
  ({ taskId: taskIdWithOccurrence, minimal }: TaskListItemProps) => {
    const {
      tasksStore,
      pagesStore,
      taskOccurrencesStore,
      agentWorklogsStore,
      conversationsStore,
    } = useContextStore();

    const {
      selectedTasks,
      setHoverTask,
      changeActiveTab,
      hoverTask,
      addToSelectedTask,
      removeSelectedTask,
    } = useApplication();
    const taskId = taskIdWithOccurrence.split('__')[0];
    const taskOccurrenceId = taskIdWithOccurrence.split('__')[1];
    const agentWorklogForTask =
      agentWorklogsStore.getAgentWorklogForTask(taskId);
    const conversationForTask =
      conversationsStore.getConversationForTask(taskId);

    const taskOccurrence = taskOccurrencesStore.getTaskOccurrenceWithTaskAndId(
      taskId,
      taskOccurrenceId,
    );
    const task = tasksStore.getTaskWithId(taskId);
    const page = pagesStore.getPageWithId(task?.pageId);
    const { mutate: updateTask } = useUpdateTaskMutation({});
    const taskSelected = selectedTasks.includes(taskIdWithOccurrence);
    const { mutate: updateTaskOccurrence } =
      useUpdateSingleTaskOccurrenceMutation({});

    const statusChange = (status: string) => {
      if (task && task.recurrence.length > 0 && taskOccurrenceId) {
        updateTaskOccurrence({
          taskOccurrenceId,
          status,
        });
        return;
      }

      updateTask({
        taskId: task.id,
        status,
      });
    };

    const taskSelect = (taskId: string) => {
      changeActiveTab(TabViewType.MY_TASKS, { entityId: taskId });
    };

    const getStatus = () => {
      if (task && task.recurrence.length > 0 && taskOccurrence) {
        return taskOccurrence?.status;
      }

      return task.status;
    };

    useHotkeys(
      ['x'],
      () => {
        if (hoverTask === taskIdWithOccurrence) {
          if (!taskSelected) {
            addToSelectedTask(taskIdWithOccurrence, false);
          } else {
            removeSelectedTask(taskIdWithOccurrence);
          }
        }
      },
      {
        scopes: [SCOPES.Tasks],
        preventDefault: true,
      },
      [hoverTask, selectedTasks, taskSelected, taskIdWithOccurrence],
    );

    if (!task) {
      return null;
    }

    return (
      <div
        className="pl-1 pr-4 flex group cursor-default gap-2"
        onClick={() => {
          taskSelect(taskId);
        }}
        onMouseOver={() => {
          if (taskIdWithOccurrence !== hoverTask) {
            setHoverTask(taskIdWithOccurrence);
          }
        }}
      >
        <div className="w-full flex items-center">
          {!minimal && (
            <div
              className={cn(
                'flex items-center py-2.5 pl-4 group-hover:pl-0',
                taskSelected && 'pl-0',
              )}
            >
              <div
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
                <TooltipWrapper tooltip="">
                  <Checkbox
                    className={cn(
                      'hidden group-hover:block',
                      taskSelected && 'block',
                    )}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        addToSelectedTask(taskIdWithOccurrence, false);
                      } else {
                        removeSelectedTask(taskIdWithOccurrence);
                      }
                    }}
                    checked={taskSelected}
                  />
                </TooltipWrapper>
              </div>
            </div>
          )}
          <div
            className={cn(
              'flex grow items-start gap-2 pl-2 ml-1 pr-2 group-hover:bg-grayAlpha-100 rounded-xl shrink min-w-[0px]',
              taskSelected && 'bg-primary/10',
              minimal && '-ml-2 gap-1',
            )}
          >
            <div
              className="pt-2 shrink-0 flex items-center"
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <Checkbox
                className={cn(
                  'shrink-0 relative top-1 h-[18px] w-[18px]',
                  minimal && 'top-[1px]',
                )}
                checked={getStatus() === 'Done'}
                onCheckedChange={(value: boolean) =>
                  statusChange(value === true ? 'Done' : 'Todo')
                }
              />
            </div>

            <div
              className={cn(
                'flex flex-col w-full py-2 border-b border-border shrink min-w-[0px]',
                minimal && 'border-none py-1.5',
              )}
            >
              <div className="flex w-full justify-between gap-4 items-center">
                <div className="flex gap-2 w-full items-center min-w-[0px] shrink">
                  <div className="text-muted-foreground font-mono min-w-[40px] pl-1 relative text-sm self-center shrink-0">
                    T-{task.number}
                  </div>
                  <div className="inline-flex items-center justify-start shrink min-w-[0px] min-h-[24px]">
                    <div
                      className={cn(
                        'text-left truncate',
                        getStatus() === 'Done' &&
                          'line-through opacity-60 decoration-[1px] decoration-muted-foreground',
                      )}
                    >
                      {page?.title}
                    </div>
                  </div>
                  <div className="flex">
                    <TaskInfo
                      task={task}
                      minimal={minimal}
                      taskOccurrenceId={
                        task.startTime ? taskOccurrenceId : undefined
                      }
                    />

                    {agentWorklogForTask && (
                      <span
                        className="text-sm font-medium text-muted-foreground bg-gradient-to-r from-[#F48FD7] via-[#6528FD] to-[#F48FD7] 
            bg-[length:200%_100%] bg-clip-text text-transparent animate-gradient-slide"
                      >
                        Thinking...
                      </span>
                    )}

                    {conversationForTask &&
                      (conversationForTask.status === 'need_attention' ||
                        conversationForTask.status === 'need_approval') &&
                      conversationForTask.unread && (
                        <TooltipWrapper tooltip="Task needs your attention">
                          <Badge className="font-mono h-5 !bg-destructive">
                            !
                          </Badge>
                        </TooltipWrapper>
                      )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  },
);
