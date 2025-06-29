/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SkillComponentType } from '../types';

import {
  ChevronDown,
  ChevronRight,
  cn,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  LoaderLine,
} from '@redplanethq/ui';
import React from 'react';

import { Claude } from 'icons';

const getMessageText = (data: any[]) => {
  return data
    .filter((item) => item.type === 'message')
    .map((message) => {
      return message.content
        .filter((content: any) => content.type === 'text')
        .map((content: any) => content.text)
        .join('\n');
    })
    .join('\n');
};

export const ClaudeCoding = ({
  streaming,
  actionStream,
  actionData,
}: SkillComponentType) => {
  const [open, setOpen] = React.useState(false);

  const getCollapsibleContent = () => {
    if (!streaming) {
      const actionOutput = actionData[0].actionOutput;
      let data = [];

      try {
        data = JSON.parse(actionOutput);
        const messageText = getMessageText(data);
        return (
          <div className="p-1 px-3">
            <pre className="text-sm !bg-transparent">{messageText}</pre>
          </div>
        );
      } catch (e) {
        return <div className="p-4">Failed to parse data</div>;
      }
    }

    if (actionStream) {
      const messageText = getMessageText(actionStream.content);

      return (
        <div className="p-1 px-3">
          <pre className="text-sm !bg-transparent !font-normal !text-foreground !not-italic !font-[normal] font-sans">
            {messageText}
          </pre>
        </div>
      );
    }

    return null;
  };

  return (
    <Collapsible
      className={cn(
        'content bg-grayAlpha-100 w-fit rounded mb-0.5',
        open && 'w-full',
      )}
      open={open}
      onOpenChange={setOpen}
    >
      <CollapsibleTrigger className="p-2 px-3 h-full flex gap-1 items-center">
        <div className="flex gap-2 items-center text-sm">
          <Claude size={16} /> Claude code
          {streaming && actionStream && actionStream.isStreaming && (
            <LoaderLine size={18} className="animate-spin" />
          )}
        </div>
        <div className="px-0">
          {!open ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>{getCollapsibleContent()}</CollapsibleContent>
    </Collapsible>
  );
};
