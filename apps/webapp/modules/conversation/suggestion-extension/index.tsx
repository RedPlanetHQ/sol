/* eslint-disable jsx-a11y/alt-text */
import { cn, IssuesLine, Project } from '@redplanethq/ui';
import Mention from '@tiptap/extension-mention';
import {
  mergeAttributes,
  type NodeViewProps,
  NodeViewWrapper,
  ReactNodeViewRenderer,
} from '@tiptap/react';
import { Image } from 'lucide-react';
import { observer } from 'mobx-react-lite';

import { getBotIcon, type IconType } from 'common/icon-utils';

import { useContextStore } from 'store/global-context-provider';

import { useMCPServers } from './use-context';
import { useContextSuggestions } from './use-context-suggestions';

export const MentionComponent = observer((props: NodeViewProps) => {
  const { tasksStore, listsStore, pagesStore } = useContextStore();
  const servers = useMCPServers();
  const id = props.node.attrs.id;
  const label = props.node.attrs.label;

  let entity;

  if (label === 'tool') {
    entity = servers.find((server) => server.key === id);
    if (!entity) {
      return null;
    }
    const Icon = getBotIcon(id as IconType);

    return (
      <NodeViewWrapper className="inline w-fit">
        <span
          className={cn(
            'items-center gap-1 max-w-[150px] text-left bg-transparent hover:bg-grayAlpha-100 p-1 px-2 inline-flex mention bg-grayAlpha-100 h-6 rounded relative top-0.5',
          )}
          onClick={() => {}}
          data-item="mention"
        >
          <Icon size={14} className="shrink-0" />
          <div className="inline-flex items-center justify-start shrink min-w-[0px] min-h-[24px]">
            <div className={cn('text-left truncate')}>{entity.name}</div>
          </div>
        </span>
      </NodeViewWrapper>
    );
  }

  if (label === 'screenshot') {
    return (
      <NodeViewWrapper className="inline w-fit">
        <span
          className={cn(
            'items-center gap-1 max-w-[150px] text-left bg-transparent hover:bg-grayAlpha-100 p-1 px-2 inline-flex mention bg-grayAlpha-100 h-6 rounded relative top-0.5',
          )}
          onClick={() => {}}
          data-item="mention"
        >
          <Image size={14} />
          <div className="inline-flex items-center justify-start shrink min-w-[0px] min-h-[24px]">
            <div className={cn('text-left truncate')}>Screenshot</div>
          </div>
        </span>
      </NodeViewWrapper>
    );
  }

  entity =
    label === 'list'
      ? listsStore.getListWithId(id)
      : tasksStore.getTaskWithId(id);

  if (!entity) {
    return null;
  }

  const page = pagesStore.getPageWithId(entity.pageId);

  return (
    <NodeViewWrapper className="inline w-fit">
      <span
        className={cn(
          'items-center gap-1 max-w-[150px] text-left bg-transparent hover:bg-grayAlpha-100 p-1 px-2 inline-flex mention bg-grayAlpha-100 h-6 rounded relative top-0.5',
        )}
        onClick={() => {}}
        data-item="mention"
      >
        {label === 'task' ? (
          <IssuesLine size={14} className="shrink-0" />
        ) : (
          <Project size={14} className="rounded-sm shrink-0" />
        )}

        <div className="inline-flex items-center justify-start shrink min-w-[0px] min-h-[24px]">
          <div className={cn('text-left truncate')}>{page.title}</div>
        </div>
      </span>
    </NodeViewWrapper>
  );
});

export const CustomMention = Mention.extend({
  parseHTML() {
    return [
      {
        tag: 'mention',
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ['mention', mergeAttributes(HTMLAttributes)];
  },
  addNodeView() {
    return ReactNodeViewRenderer(MentionComponent);
  },
});

export { useContextSuggestions };
