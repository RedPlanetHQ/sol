import { cn, LoaderLine } from '@redplanethq/ui';
import { Command, CommandItem, CommandList } from '@redplanethq/ui';
import { Document } from '@tiptap/extension-document';
import HardBreak from '@tiptap/extension-hard-break';
import { History } from '@tiptap/extension-history';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Text } from '@tiptap/extension-text';
import { MessageSquare } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import Image from 'next/image';
import { EditorContent, CodeBlockLowlight, Placeholder } from 'novel';
import { useState } from 'react';
import React from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { Key } from 'ts-key-enum';

import {
  CustomMention,
  useContextSuggestions,
} from 'modules/conversation/suggestion-extension';
import { useSearchCommands } from 'modules/search/command/use-search-commands';

import { EditorRoot, lowlight, type EditorT } from 'common/editor';
import { imageExtension } from 'common/editor/image-extension';
import { SCOPES } from 'common/shortcut-scopes';

import { useIPC } from 'hooks/ipc';

import { useCreateConversationMutation } from 'services/conversations';

export const QuickEditor = observer(
  ({ onChange }: { onChange?: (text: string) => void }) => {
    const ipc = useIPC();
    const [text, setText] = useState('');
    const [html, setHTML] = useState('');
    const [editor, setEditor] = React.useState<EditorT>();

    const suggestion = useContextSuggestions(false);
    const { mutate: createConversation, isLoading: createConversationLoading } =
      useCreateConversationMutation({});

    const commands = useSearchCommands(
      text,
      () => {
        editor.commands.clearContent(true);
        setText('');
        setHTML('');
        ipc.sendMessage('quick-window-close');
      },
      true,
      true,
    );

    useHotkeys(
      Key.Escape,
      () => {
        if (ipc) {
          ipc.sendMessage('quick-window-close');
        }
      },
      {
        scopes: [SCOPES.Global],
        enableOnFormTags: true,
        enableOnContentEditable: true,
      },
    );

    const onCommentUpdate = (editor: EditorT) => {
      setHTML(editor.getHTML());
      setText(editor.getText());
      onChange && onChange(editor.getText());
    };

    const startChat = () => {
      createConversation(
        {
          message: html,
          context: {
            agents: [],
            resources: [],
          },
          title: text,
        },
        {
          onSuccess: (data) => {
            ipc.sendToMain({ type: 'Conversation', id: data.conversationId });
            editor.commands.clearContent(true);
            setText('');
            setHTML('');
          },
        },
      );
    };

    const pagesCommands = () => {
      const allCommands = [...commands['Pages']];
      const create_task_commands = !text.includes('\n')
        ? commands['create_tasks']
        : [];

      return (
        <>
          <CommandItem
            onSelect={() => {
              startChat();
            }}
            key={`page__${pagesCommands.length + 1}`}
            className="flex gap-1 items-center py-2 aria-selected:bg-grayAlpha-100"
          >
            <div className="inline-flex items-center gap-2 min-w-[0px]">
              <MessageSquare size={16} className="shrink-0" />
              <div className="truncate"> {text} - Chat </div>
            </div>
          </CommandItem>

          {create_task_commands.map((command, index) => {
            return (
              <CommandItem
                onSelect={command.command}
                key={`page__c${index}`}
                className="flex gap-1 items-center py-2 aria-selected:bg-grayAlpha-100"
              >
                <div className="inline-flex items-center gap-2 min-w-[0px]">
                  <command.Icon size={16} className="shrink-0" />
                  <div className="truncate"> {command.text}</div>
                </div>
              </CommandItem>
            );
          })}

          {allCommands.splice(0, 5).map((command, index: number) => {
            return (
              <CommandItem
                onSelect={command.command}
                key={`page__${index}`}
                className="flex gap-1 items-center py-2 aria-selected:bg-grayAlpha-100"
              >
                <div className="inline-flex items-center gap-2 min-w-[0px]">
                  <command.Icon size={16} className="shrink-0" />
                  <div className="truncate"> {command.text}</div>
                </div>
              </CommandItem>
            );
          })}
        </>
      );
    };

    const emptyContainer = () => {
      if (createConversationLoading) {
        return (
          <div className="flex w-full flex-col items-center">
            <LoaderLine size={18} className="animate-spin" />

            <div className="font-mono"> Loading </div>
          </div>
        );
      }

      if (!text) {
        return (
          <div className="flex w-full flex-col items-center">
            <Image
              src="/logo_light.svg"
              alt="logo"
              key={1}
              width={60}
              height={60}
            />
            <div className="font-mono"> SOL </div>
          </div>
        );
      }

      return null;
    };

    return (
      <Command className="rounded-lg bg-background-3 mt-0 w-full rounded-xl !h-auto">
        <EditorRoot>
          <EditorContent
            extensions={[
              Document,
              Paragraph,
              Text,
              CustomMention.configure({
                suggestion,
              }),
              CodeBlockLowlight.configure({
                lowlight,
              }),
              History,
              imageExtension,
              HardBreak.configure({
                keepMarks: true,
              }),
              Placeholder.configure({
                placeholder: () => {
                  return 'Ask sol...';
                },
                includeChildren: true,
              }),
            ]}
            onCreate={async ({ editor }) => {
              setEditor(editor);
              await new Promise((resolve) => setTimeout(resolve, 100));

              editor.commands.focus('end');
            }}
            onUpdate={({ editor }) => {
              onCommentUpdate(editor);
            }}
            shouldRerenderOnTransaction={false}
            editorProps={{
              attributes: {
                class: `prose prose-lg dark:prose-invert prose-headings:font-title font-default focus:outline-none max-w-full`,
              },
              handleKeyDown(view, event) {
                // Block default Enter
                if (event.key === 'Enter' && !event.shiftKey) {
                  const mentionItem = document.querySelector(
                    '[data-selected="true"]',
                  ) as HTMLElement;

                  if (mentionItem) {
                    mentionItem.click();
                    return true;
                  }

                  const activeItem = document.querySelector(
                    '[aria-selected="true"]',
                  ) as HTMLElement;

                  if (activeItem) {
                    activeItem.click();
                    return true;
                  }

                  if (html) {
                    // handleSend();
                    return true;
                  }

                  return false;
                }

                // Allow Shift+Enter to insert hard break
                if (event.key === 'Enter' && event.shiftKey) {
                  view.dispatch(
                    view.state.tr.replaceSelectionWith(
                      view.state.schema.nodes.hardBreak.create(),
                    ),
                  );
                  return true;
                }

                return false;
              },
            }}
            immediatelyRender={false}
            className={cn(
              'editor-container w-full min-w-full text-base sm:rounded-lg px-3 max-h-[200px] pt-1 min-h-[30px] overflow-auto border-b border-border py-3',
            )}
          ></EditorContent>
        </EditorRoot>

        <CommandList className="p-2">
          {text && text.slice(-1) !== '@' && pagesCommands()}
          {emptyContainer()}
        </CommandList>
      </Command>
    );
  },
);
