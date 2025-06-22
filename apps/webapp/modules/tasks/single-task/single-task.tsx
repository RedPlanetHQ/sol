import { cn, ScrollArea } from '@redplanethq/ui';
import { sort } from 'fast-sort';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { Key } from 'ts-key-enum';

import { SCOPES } from 'common/shortcut-scopes';
import { RightSideViewContext } from 'layouts/right-side-layout';

import { useApplication } from 'hooks/application';
import { useScope } from 'hooks/use-scope';

import { useUpdateTaskMutation } from 'services/tasks';

import { TabViewType } from 'store/application';
import { useContextStore } from 'store/global-context-provider';

import { SingleTaskEditor } from './single-task-editor';
import { SingleTaskMetadata } from './single-task-metadata';
import { SingleTaskStatus } from './single-task-status';
import { PageTitle } from './single-task-title';

interface SingleTaskProps {
  index?: number;
  taskId: string;
  sideView?: boolean;
}

export const SingleTaskWithoutLayout = observer(
  ({ taskId }: SingleTaskProps) => {
    useScope(SCOPES.Task);

    const { tasksStore, pagesStore, taskOccurrencesStore, conversationsStore } =
      useContextStore();
    const task = tasksStore.getTaskWithId(taskId);
    const page = pagesStore.getPageWithId(task?.pageId);
    const { changeActiveTab, updateConversationId } = useApplication();
    const { mutate: updateTask } = useUpdateTaskMutation({});
    const { onOpen } = React.useContext(RightSideViewContext);
    const conversationForTask =
      conversationsStore.getConversationForTask(taskId);

    useHotkeys(
      [Key.Escape],
      () => {
        changeActiveTab(TabViewType.MY_TASKS, {});
      },
      {
        scopes: [SCOPES.Task],
      },
    );

    React.useEffect(() => {
      if (
        conversationForTask &&
        (conversationForTask.status === 'need_attention' ||
          conversationForTask.status === 'need_approval') &&
        conversationForTask.unread
      ) {
        updateConversationId(conversationForTask.id);
        onOpen();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const onChange = (title: string) => {
      updateTask({
        taskId: task.id,
        title,
      });
    };

    const getStatus = () => {
      // Get yesterday's end of day
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(23, 59, 59, 999);

      const taskOccurrences = taskOccurrencesStore.getTaskOccurrencesForTask(
        task.id,
      );

      // Filter and sort occurrences after yesterday
      const sortedOccurrences = sort(
        taskOccurrences.filter((occ) => new Date(occ.startTime) > yesterday),
      ).by([{ asc: (u) => u.startTime }]);

      const recentTaskOccurrence = sortedOccurrences[0];

      if (task && task.recurrence.length > 0 && recentTaskOccurrence) {
        return recentTaskOccurrence?.status;
      }

      return task.status;
    };

    if (!task || !page) {
      return null;
    }

    return (
      <ScrollArea className="w-full h-full flex justify-center p-4 h-[calc(100vh_-_54px)]">
        <div className="flex h-full justify-center w-full">
          <div className="grow flex flex-col gap-2 h-full max-w-[97ch]">
            <div className="px-4 flex gap-2 items-start">
              <SingleTaskStatus task={task} />
              <PageTitle
                value={page.title}
                onChange={onChange}
                className={cn(
                  getStatus() === 'Done' &&
                    'line-through opacity-60 decoration-[1px] decoration-muted-foreground',
                )}
              />
            </div>

            <SingleTaskMetadata task={task} />

            <div className="flex flex-col gap-0 pt-1 px-4">
              <SingleTaskEditor page={page} task={task} />
            </div>
          </div>
        </div>
      </ScrollArea>
    );
  },
);

export const SingleTask = observer(
  ({ taskId, sideView = false }: SingleTaskProps) => {
    return <SingleTaskWithoutLayout taskId={taskId} sideView={sideView} />;
  },
);
