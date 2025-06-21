import { Badge, ParentIssueLine } from '@redplanethq/ui';
import { observer } from 'mobx-react-lite';
import React from 'react';

import { getIcon } from 'common/icon-picker';
import type { TaskType } from 'common/types';

import { useApplication } from 'hooks/application';

import { TabViewType } from 'store/application';
import { useContextStore } from 'store/global-context-provider';

import { ScheduleDropdown } from '../metadata';
import { DuedateDropdown } from '../metadata/due-date';
import { SubTasks } from '../metadata/sub-tasks';
import { TaskExternalInfo } from '../task-external-info';

interface SingleTaskMetadataProps {
  task: TaskType;
}

export const SingleTaskMetadata = observer(
  ({ task }: SingleTaskMetadataProps) => {
    const { tasksStore, pagesStore, listsStore } = useContextStore();

    const list = listsStore.getListWithId(task.listId);
    const listPage = pagesStore.getPageWithId(list?.pageId);
    const { changeActiveTab } = useApplication();

    const parentTask = () => {
      const parent = tasksStore.getTaskWithId(task?.parentId);
      const page = pagesStore.getPageWithId(parent?.pageId);

      if (page) {
        return (
          <Badge
            variant="secondary"
            className="flex items-center gap-1 shrink min-w-[0px] h-7 px-2 text-base"
            onClick={() =>
              changeActiveTab(TabViewType.MY_TASKS, { entityId: parent.id })
            }
          >
            <ParentIssueLine size={16} />{' '}
            <span className="text-muted-foreground">Parent</span>{' '}
            <span className="max-w-[100px] truncate">{page?.title}</span>
          </Badge>
        );
      }

      return null;
    };

    return (
      <>
        <div className="p-2 mx-2 flex gap-2 rounded bg-grayAlpha-50 items-center">
          <div className="mx-2 font-mono"> T-{task.number}</div>
          <ScheduleDropdown task={task} /> <DuedateDropdown task={task} />
          <SubTasks taskId={task.id} />
          {list && (
            <Badge
              variant="secondary"
              className="flex items-center gap-1 shrink max-w-[300px] h-7 p-2 text-base"
              onClick={() =>
                changeActiveTab(
                  TabViewType.LIST,
                  list.id ? { entityId: list.id } : {},
                )
              }
            >
              {getIcon(list?.icon, 16)}
              <span className="shrink  min-w-[0px] truncate">
                {listPage?.title}
              </span>
            </Badge>
          )}
          {task.parentId && parentTask()}
          <TaskExternalInfo task={task} />
        </div>
      </>
    );
  },
);
