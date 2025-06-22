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
import Image from 'next/image';
import React from 'react';

export const Memory = ({
  streaming,
  actionData,
  actionStream,
}: SkillComponentType) => {
  const [open, setOpen] = React.useState(false);
  const getCollapsibleContent = () => {
    if (!streaming) {
      const actionOutput = actionData[0].actionOutput;
      let data = [];

      try {
        data = JSON.parse(actionOutput);
        return (
          <div className="p-1 px-3">
            <div className="mb-4">
              <h3 className="font-semibold mb-2">Episodes</h3>
              <ul className="list-disc pl-4">
                {data.episodes.map((episode: string, i: number) => (
                  <li key={i} className="mb-2 text-sm">
                    {episode}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Facts</h3>
              <ul className="list-disc pl-4">
                {data.facts.map((fact: string, i: number) => (
                  <li key={i} className="mb-2 text-sm">
                    {fact}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        );
      } catch (e) {
        return <div className="p-4">Failed to parse data</div>;
      }
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
          <Image
            src="/logo_light.svg"
            alt="logo"
            key={1}
            width={20}
            height={20}
          />{' '}
          Memory
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
