import {
  ChevronDown,
  ChevronRight,
  cn,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Loader,
  LoaderLine,
} from '@redplanethq/ui';
import { NodeViewWrapper } from '@tiptap/react';
import { observer } from 'mobx-react-lite';
import Image from 'next/image';
import React from 'react';

import { ClaudeCoding } from 'modules/editor/claude';
import { JSONEditor } from 'modules/settings/json-editor';

import { getIcon as iconUtil, type IconType } from 'common/icon-utils';

import { useGetConversationHistoryAction } from 'services/conversations';

import { ConversationContext } from '../conversation-context';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const EXISTING_COMPONENTS: Record<string, React.FC<any>> = {
  'claude--coding': ClaudeCoding,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const SkillComponent = observer((props: any) => {
  const id = props.node.attrs.id;
  const name = props.node.attrs.name;
  const agent = props.node.attrs.agent;
  const [open, setOpen] = React.useState(false);
  const { streaming, conversationHistoryId, actionMessages } =
    React.useContext(ConversationContext);

  const {
    data: actionData,
    isLoading,
    refetch,
  } = useGetConversationHistoryAction(conversationHistoryId, id);

  const actionMessagesForAction = actionMessages ? actionMessages[id] : {};

  if (id === 'undefined' || id === undefined || !name) {
    return null;
  }

  React.useEffect(() => {
    if (!streaming) {
      refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streaming, conversationHistoryId]);

  const getIcon = () => {
    if (agent === 'sol') {
      return (
        <Image
          src="/logo_light.svg"
          alt="logo"
          key={1}
          width={18}
          height={18}
        />
      );
    }
    const Icon = iconUtil(agent as IconType);

    return <Icon size={18} className="rounded-sm" />;
  };

  const snakeToTitleCase = (input: string): string => {
    if (!input) {
      return '';
    }

    const words = input.split('_');

    // First word: capitalize first letter
    const firstWord =
      words[0].charAt(0).toUpperCase() + words[0].slice(1).toLowerCase();

    // Rest of the words: all lowercase
    const restWords = words.slice(1).map((word) => word.toLowerCase());

    // Join with spaces
    return [firstWord, ...restWords].join(' ');
  };

  const getComponent = () => {
    if (Object.keys(EXISTING_COMPONENTS).includes(`${agent}--${name}`)) {
      const Component = EXISTING_COMPONENTS[`${agent}--${name}`];

      return (
        <Component
          streaming={streaming}
          actionStream={actionMessagesForAction}
          id={id}
          agent={agent}
          name={name}
          actionData={actionData}
        />
      );
    }

    return (
      <Collapsible
        className={cn(
          'content bg-grayAlpha-100 w-fit rounded mb-0.5 !mt-2',
          open && 'w-full',
        )}
        open={open}
        onOpenChange={setOpen}
      >
        <CollapsibleTrigger className="p-2 px-3 h-full flex gap-1 items-center">
          <div className="flex gap-2 items-center text-sm">
            {getIcon()}
            <span className="font-mono text-sm">{snakeToTitleCase(name)}</span>

            {streaming &&
              actionMessagesForAction &&
              actionMessagesForAction.isStreaming && (
                <LoaderLine size={18} className="animate-spin" />
              )}
          </div>
          <div className="px-0">
            {!open ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="flex flex-col py-1 px-7">
            <h3>Action input</h3>
            <div className="">
              <JSONEditor
                autoFocus
                defaultValue={actionData[0]?.actionInput}
                readOnly
                basicSetup
                showClearButton={false}
                showCopyButton={false}
                height="100%"
                min-height="100%"
                max-height="100%"
              />
            </div>
          </div>

          <div className="flex flex-col py-1 pb-4 px-7">
            <h3>Action output</h3>
            <div className="">
              <JSONEditor
                autoFocus
                defaultValue={actionData[0]?.actionOutput}
                readOnly
                basicSetup
                showClearButton={false}
                showCopyButton={false}
                height="100%"
                min-height="100%"
                max-height="100%"
              />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  };

  return (
    <NodeViewWrapper className="inline w-fit">
      {isLoading ? <Loader /> : getComponent()}
    </NodeViewWrapper>
  );
});
