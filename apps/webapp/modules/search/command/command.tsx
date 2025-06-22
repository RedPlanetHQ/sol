import {
  ArrowRight,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  IssuesLine,
} from '@redplanethq/ui';
import { observer } from 'mobx-react-lite';
import React from 'react';

import { Shortcut } from 'common/shortcut';

import { useApplication } from 'hooks/application';

import { useContextStore } from 'store/global-context-provider';

import { useSearchCommands } from './use-search-commands';

interface CommandComponentProps {
  onClose?: () => void;
  fromQuickWindow?: boolean;
}

export const CommandComponent = observer(
  ({ onClose }: CommandComponentProps) => {
    const { tasksStore, pagesStore } = useContextStore();
    const { selectedTasks } = useApplication();

    const [value, setValue] = React.useState('');
    const commands = useSearchCommands(value, onClose);

    const defaultCommands = () => {
      const defaultCommands = commands['default'];

      return (
        <>
          {defaultCommands.map((command, index: number) => {
            return (
              <CommandItem
                onSelect={command.command}
                key={`default__${index}`}
                className="flex gap-2 items-center py-2"
              >
                <command.Icon size={16} />
                <div className="grow">{command.text}</div>
                {command.shortcut && (
                  <Shortcut shortcut={command.shortcut} className="font-mono" />
                )}
              </CommandItem>
            );
          })}
        </>
      );
    };

    const settingsCommands = () => {
      const settingsCommands = commands['settings'];

      if (!settingsCommands) {
        return null;
      }

      return (
        <CommandGroup heading="Settings">
          {settingsCommands.map((command, index: number) => {
            return (
              <CommandItem
                onSelect={command.command}
                key={`default__${index}`}
                className="flex gap-2 items-center py-2"
              >
                <command.Icon size={16} />
                <div className="grow flex gap-2 items-center">
                  <div>Settings</div> <ArrowRight size={14} />
                  <div>{command.text}</div>
                </div>
                {command.shortcut && (
                  <Shortcut shortcut={command.shortcut} className="font-mono" />
                )}
              </CommandItem>
            );
          })}
        </CommandGroup>
      );
    };

    const pagesCommands = () => {
      const pagesCommands = commands['Pages'];

      if (!pagesCommands) {
        return null;
      }

      return (
        <CommandGroup heading="Pages">
          {pagesCommands.map((command, index: number) => {
            return (
              <CommandItem
                onSelect={command.command}
                key={`page__${index}`}
                className="flex gap-1 items-center py-2"
              >
                <div className="inline-flex items-center gap-2 min-w-[0px]">
                  <command.Icon size={16} className="shrink-0" />
                  <div className="truncate"> {command.text}</div>
                </div>
              </CommandItem>
            );
          })}
        </CommandGroup>
      );
    };

    const taskCommands = () => {
      const taskCommands = commands['Task'];

      if (!taskCommands) {
        return null;
      }

      return (
        <CommandGroup heading="Task">
          {taskCommands.map((command, index: number) => {
            return (
              <CommandItem
                onSelect={command.command}
                key={`task__${index}`}
                className="flex gap-1 items-center py-2"
              >
                <command.Icon size={16} className="shrink-0" />
                <div className="grow"> {command.text}</div>
                {command.shortcut && (
                  <Shortcut shortcut={command.shortcut} className="font-mono" />
                )}
              </CommandItem>
            );
          })}
        </CommandGroup>
      );
    };

    const createTaskCommands = () => {
      const taskCommands = commands['create_tasks'];

      if (!taskCommands) {
        return null;
      }

      return (
        <>
          {taskCommands.map((command, index: number) => {
            return (
              <CommandItem
                onSelect={command.command}
                key={`task__${index}`}
                className="flex gap-1 items-center py-2"
              >
                <command.Icon size={16} className="shrink-0" />
                <div className="grow"> {command.text}</div>
              </CommandItem>
            );
          })}
        </>
      );
    };

    const getTasksComponent = () => {
      if (selectedTasks.length === 0) {
        return null;
      }

      if (selectedTasks.length > 1) {
        return (
          <div className="max-w-[400px] p-2 pb-0 flex gap-1">
            <div className="flex gap-1 bg-grayAlpha-100 px-2 rounded items-center">
              <IssuesLine size={16} className="shrink-0" />
              <div className="truncate w-fit py-1">
                {selectedTasks.length} selected
              </div>
            </div>
          </div>
        );
      }

      const taskId = selectedTasks[0].split('__')[0];

      const task = tasksStore.getTaskWithId(taskId);
      const page = pagesStore.getPageWithId(task?.pageId);

      return (
        <div className="max-w-[400px] p-2 pb-0 flex gap-1">
          <div className="flex gap-1 bg-grayAlpha-100 px-2 rounded items-center">
            <IssuesLine size={16} className="shrink-0" />
            <div className="truncate w-fit py-1">{page?.title}</div>
          </div>
        </div>
      );
    };

    return (
      <>
        {getTasksComponent()}
        <CommandInput
          placeholder="Search/Ask anything..."
          className="rounded-md h-10"
          containerClassName="border-none"
          value={value}
          icon
          autoFocus
          onValueChange={(value: string) => setValue(value)}
        />
        <CommandList className="p-2 pt-0 flex-1 max-h-[100%]">
          <CommandEmpty>No results found.</CommandEmpty>
          {defaultCommands()}
          {settingsCommands()}
          {taskCommands()}
          {createTaskCommands()}
          {pagesCommands()}
        </CommandList>
      </>
    );
  },
);
