import {
  Button,
  CalendarLine,
  ChevronDown,
  ChevronRight,
  cn,
  IssuesLine,
} from '@redplanethq/ui';
import { observer } from 'mobx-react-lite';
import React from 'react';
import {
  AutoSizer,
  CellMeasurer,
  CellMeasurerCache,
  type Index,
  type ListRowProps,
} from 'react-virtualized';

import { TaskListItem } from 'modules/tasks/task-item';

import { ScrollManagedList } from 'common/virtualized-list';

import { useTaskRows } from './utils';

export const ScheduleList = observer(() => {
  const [collapsedHeaders, setCollapsedHeaders] = React.useState<
    Record<string, boolean>
  >({});

  const rows = useTaskRows(collapsedHeaders);

  // Create a CellMeasurerCache instance
  const cache = new CellMeasurerCache({
    defaultHeight: 45, // Default row height
    fixedWidth: true, // Rows have fixed width but dynamic height
  });

  React.useEffect(() => {
    cache.clearAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  const toggleHeaderCollapse = (planDay: string) => {
    setCollapsedHeaders((prev) => ({
      ...prev,
      [planDay]: !prev[planDay],
    }));
    cache.clearAll();
  };

  const getHeaderRow = (
    row: { type: string; key: string; count: number },
    index: number,
  ) => {
    if (!row) {
      return null;
    }

    return (
      <div className={cn('flex gap-1 items-end ml-4 my-1')}>
        <Button
          className={cn(
            'flex items-center w-fit rounded-xl text-accent-foreground cursor-default group bg-grayAlpha-100 gap-0 px-4 py-4',
            index !== 0 && 'mt-4',
          )}
          variant="ghost"
          onClick={() => toggleHeaderCollapse(row.key)}
        >
          <div className="h-5 w-5 group-hover:hidden flex items-center text-foreground">
            <CalendarLine size={18} />
          </div>
          <div className="hidden group-hover:block text-foreground">
            {!collapsedHeaders[row.key] ? (
              <ChevronDown size={20} />
            ) : (
              <ChevronRight size={20} />
            )}
          </div>
          <h3 className="pl-2 text-foreground">{row.key}</h3>
        </Button>
        <div className="rounded-2xl bg-grayAlpha-100 p-1.5 px-2 font-mono">
          {row.count}
        </div>
      </div>
    );
  };

  const rowRender = ({ index, style, key, parent }: ListRowProps) => {
    const row = rows[index];

    if (!row) {
      return null;
    }

    return (
      <CellMeasurer
        key={key}
        cache={cache}
        columnIndex={0}
        parent={parent}
        rowIndex={index}
      >
        <div style={style} key={key}>
          {row.type === 'header' ? (
            getHeaderRow(row, index)
          ) : (
            <TaskListItem taskId={row.taskId} key={key} />
          )}
        </div>
      </CellMeasurer>
    );
  };

  const rowHeight = ({ index }: Index) => {
    return cache.getHeight(index, 0);
  };

  return (
    <AutoSizer className="h-full mt-2 px-1">
      {({ width, height }) => (
        <ScrollManagedList
          className="!h-auto"
          listId="schedule-list"
          height={height}
          overscanRowCount={10}
          noRowsRenderer={() => (
            <div className="p-4 h-full flex flex-col items-center justify-start gap-3 mt-4">
              <IssuesLine size={30} />
              No scheduled tasks
            </div>
          )}
          rowCount={rows.length + 2}
          rowHeight={rowHeight}
          deferredMeasurementCache={cache}
          rowRenderer={rowRender}
          width={width}
          shallowCompare
        />
      )}
    </AutoSizer>
  );
});
