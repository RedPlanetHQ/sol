import { cn, IssuesLine, Project } from '@redplanethq/ui';
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from 'react';

import { getBotIcon, type IconType } from 'common/icon-utils';
import type { PageType } from 'common/types';

import { useContextStore } from 'store/global-context-provider';

interface MentionListProps {
  items: Array<PageType & { label?: string; key?: string }>;
  command: (args: { id: string; label: string }) => void;
}

export const MentionList = forwardRef(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (props: MentionListProps, ref: React.Ref<any>) => {
    const { tasksStore, listsStore } = useContextStore();

    const [selectedIndex, setSelectedIndex] = useState(0);

    const selectItem = (index: number) => {
      const item = props.items[index];

      if (item.label === 'tool') {
        props.command({
          id: item.key,
          label: 'tool',
        });
        return;
      }

      const task = tasksStore.getTaskForPage(item.id);
      const list = listsStore.getListWithPageId(item.id);

      if (item) {
        props.command({
          id: task ? task.id : list.id,
          label: task ? 'task' : 'list',
        });
      }
    };

    const upHandler = () => {
      setSelectedIndex(
        (prevIndex) =>
          (prevIndex + props.items.length - 1) % props.items.length,
      );
    };

    const downHandler = () => {
      setSelectedIndex((prevIndex) => (prevIndex + 1) % props.items.length);
    };

    const enterHandler = () => {
      selectItem(selectedIndex);
    };

    useEffect(() => {
      setSelectedIndex(0);
    }, [props.items]);

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }: { event: KeyboardEvent }) => {
        switch (event.key) {
          case 'ArrowUp':
            upHandler();
            return true;
          case 'ArrowDown':
            downHandler();
            return true;
          case 'Enter':
            enterHandler();
            return true;
          default:
            return false;
        }
      },
    }));

    return (
      <div className="bg-popover border border-border rounded shadow flex flex-col gap-0.5 overflow-auto p-1 relative">
        {props.items.length > 0 ? (
          props.items.map((item, index) => {
            if (item.label === 'tool') {
              const Icon = getBotIcon(item.key as IconType);
              return (
                <button
                  className={cn(
                    'flex items-center gap-1 w-full text-left bg-transparent hover:bg-grayAlpha-100 p-1 px-2',
                    index === selectedIndex
                      ? 'bg-grayAlpha-100 rounded-sm'
                      : '',
                  )}
                  key={index}
                  onClick={() => selectItem(index)}
                  data-selected={index === selectedIndex}
                  data-item="mention"
                >
                  <Icon size={14} className="shrink-0" />
                  <div className="inline-flex items-center justify-start shrink min-w-[0px] min-h-[24px]">
                    <div className={cn('text-left truncate')}>{item.title}</div>
                  </div>
                </button>
              );
            }

            const task = tasksStore.getTaskForPage(item.id);

            return (
              <button
                className={cn(
                  'flex items-center gap-1 w-full text-left bg-transparent hover:bg-grayAlpha-100 p-1 px-2',
                  index === selectedIndex ? 'bg-grayAlpha-100 rounded-sm' : '',
                )}
                key={index}
                onClick={() => selectItem(index)}
                data-selected={index === selectedIndex}
                data-item="mention"
              >
                {task ? (
                  <IssuesLine size={14} className="shrink-0" />
                ) : (
                  <Project size={14} className="rounded-sm shrink-0" />
                )}

                <div className="inline-flex items-center justify-start shrink min-w-[0px] min-h-[24px]">
                  <div className={cn('text-left truncate')}>{item.title}</div>
                </div>
              </button>
            );
          })
        ) : (
          <div className="item">No result</div>
        )}
      </div>
    );
  },
);

MentionList.displayName = 'MentionList';
