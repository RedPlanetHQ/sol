import { Button, cn } from '@redplanethq/ui';
import { Document } from '@tiptap/extension-document';
import HardBreak from '@tiptap/extension-hard-break';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Text } from '@tiptap/extension-text';
import { EditorContent, CodeBlockLowlight, Placeholder } from 'novel';
import { useState } from 'react';
import React from 'react';

import {
  CustomMention,
  useContextSuggestions,
} from 'modules/conversation/suggestion-extension';

import { EditorRoot, lowlight, type EditorT } from 'common/editor';

interface EditorAutomationProps {
  onSend: (value: string, agents: string[], title: string) => void;
  defaultValue?: string;
  isLoading?: boolean;
  className?: string;
  onClose: () => void;
}

export function EditorAutomation({
  onSend,
  defaultValue,
  isLoading = false,
  className,
  onClose,
}: EditorAutomationProps) {
  const [text, setText] = useState(defaultValue ?? '');
  const [editor, setEditor] = React.useState<EditorT>();
  const [agents, setAgents] = React.useState<string[]>([]);

  const suggestion = useContextSuggestions();

  const onCommentUpdate = (editor: EditorT) => {
    setText(editor.getHTML());
    const json = editor.getJSON();

    // Extract agent IDs from mentions
    const mentionAgents: string[] = [];

    // Process JSON to find mention nodes
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const processNode = (node: any) => {
      // Check if this is a mention node
      if (node.type === 'mention' && node.attrs && node.attrs.id) {
        mentionAgents.push(node.attrs.id);
      }

      // Recursively process child nodes if they exist
      if (node.content && Array.isArray(node.content)) {
        node.content.forEach(processNode);
      }
    };

    // Start processing from the root
    if (json.content && Array.isArray(json.content)) {
      json.content.forEach(processNode);
    }

    // Update the agents state with the found mention IDs
    setAgents(mentionAgents);
  };

  return (
    <div className="pb-4">
      <div
        className={cn('flex flex-col rounded pt-2 bg-background-3', className)}
      >
        <EditorRoot>
          <EditorContent
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            initialContent={defaultValue as any}
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
              HardBreak.configure({
                keepMarks: true,
              }),
              Placeholder.configure({
                placeholder: () => {
                  return 'Write your automation';
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
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const target = event.target as any;

                  if (target.innerHTML.includes('suggestion')) {
                    return false;
                  }

                  event.preventDefault();

                  if (text) {
                    const title = editor.getText();

                    onSend(text, agents, title);
                  }

                  return true;
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
              'editor-container w-full min-w-full text-base sm:rounded-lg px-3 max-h-[400px] min-h-[40px] overflow-auto',
            )}
          ></EditorContent>
        </EditorRoot>

        <div
          className={cn('flex justify-end gap-2 p-2 pt-0 pb-2 items-center')}
        >
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="default"
            className="transition-all duration-500 ease-in-out gap-1"
            type="submit"
            isLoading={isLoading}
            onClick={() => {
              if (text) {
                const title = editor.getText();

                onSend(text, agents, title);
              }
            }}
          >
            Add automation
          </Button>
        </div>
      </div>
    </div>
  );
}
