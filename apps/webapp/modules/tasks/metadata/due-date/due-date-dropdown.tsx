import { Badge, cn, Fire } from '@redplanethq/ui';
import {
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
  isPast,
} from 'date-fns';
import { observer } from 'mobx-react-lite';
import * as React from 'react';

import { DailogViewsContext, DialogType } from 'modules/dialog-views-provider';

import type { TaskType } from 'common/types';

interface TimeStatus {
  text: string;
  overdue: boolean;
}

const getRelativeTime = (date: Date): TimeStatus => {
  const now = new Date();
  const isOverdue = isPast(date);

  const days = Math.abs(differenceInDays(date, now));
  const hours = Math.abs(differenceInHours(date, now));
  const minutes = Math.abs(differenceInMinutes(date, now));

  let text = '';
  if (days > 0) {
    text = `${days}d`;
  } else if (hours > 0) {
    text = `${hours}h`;
  } else if (minutes > 0) {
    text = `${minutes}m`;
  } else {
    text = 'now';
  }

  return {
    text: isOverdue ? `${text} ago` : text,
    overdue: isOverdue,
  };
};

export enum DuedateDropdownVariant {
  DEFAULT = 'DEFAULT',
  SHORT = 'SHORT',
}

interface DuedateDropdownProps {
  task: TaskType;
  variant?: DuedateDropdownVariant;
}

export const DuedateDropdown = observer(
  ({
    task,
    variant = DuedateDropdownVariant.DEFAULT,
  }: DuedateDropdownProps) => {
    const { openDialog } = React.useContext(DailogViewsContext);

    const getDueDate = () => {
      if (task.dueDate) {
        const timeRelative = getRelativeTime(new Date(task.dueDate));
        const timeText = `${timeRelative.overdue ? '' : 'in'} ${timeRelative.text}`;

        return (
          <Badge
            variant="secondary"
            className={cn(
              'flex items-center gap-1 shrink min-w-[0px] text-sm',
              variant !== DuedateDropdownVariant.SHORT && 'h-7 px-2 text-base',
            )}
          >
            <Fire size={14} className="shrink-0" />
            {timeText}
          </Badge>
        );
      }

      if (DuedateDropdownVariant.SHORT === variant) {
        return null;
      }

      return (
        <Badge
          variant="secondary"
          className="flex items-center gap-1 shrink min-w-[0px] h-7 px-2"
        >
          <Fire size={16} />
        </Badge>
      );
    };

    const dueDate = getDueDate();

    if (!dueDate) {
      return null;
    }

    return (
      <div className="flex gap-1 shrink-0">
        <div
          onClick={(e) => {
            e.stopPropagation();
            openDialog(DialogType.DUEDATE);
          }}
        >
          {dueDate}
        </div>
      </div>
    );
  },
);
