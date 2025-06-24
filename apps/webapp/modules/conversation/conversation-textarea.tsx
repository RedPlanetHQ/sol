import { Button, cn, LoaderLine } from '@redplanethq/ui';
import { Document } from '@tiptap/extension-document';
import HardBreak from '@tiptap/extension-hard-break';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Text } from '@tiptap/extension-text';
import { EditorContent, CodeBlockLowlight, Placeholder } from 'novel';
import { useCallback, useState } from 'react';
import React from 'react';

import { EditorRoot, lowlight, type EditorT } from 'common/editor';

import { ResourceUploader, type Resource } from './resource';
import { CustomMention, useContextSuggestions } from './suggestion-extension';

interface ConversationTextareaProps {
  onSend: (value: string, title: string, resources: Resource[]) => void;
  defaultValue?: string;
  placeholder?: string;
  isLoading?: boolean;
  className?: string;
  onChange?: (text: string) => void;
  disabled?: boolean;
  onStop?: () => void;
}

export function ConversationTextarea({
  onSend,
  defaultValue,
  isLoading = false,
  placeholder,
  className,
  onChange,
  onStop,
}: ConversationTextareaProps) {
  const [text, setText] = useState(defaultValue ?? '');
  const [editor, setEditor] = useState<EditorT>();
  const [resources, setResources] = useState<Resource[]>([]);

  const suggestion = useContextSuggestions();

  const onUpdate = (editor: EditorT) => {
    setText(editor.getHTML());
    onChange && onChange(editor.getText());
  };

  const handleSend = useCallback(() => {
    if (!editor || !text) {
      return;
    }

    const title = editor.getText();
    onSend(text, title, resources);
    editor.commands.clearContent(true);
    setText('');
    setResources([]);
  }, [editor, text, resources, onSend]);

  return (
    <ResourceUploader
      className={cn(className)}
      resources={resources}
      setResources={setResources}
      actionComponent={
        <Button
          variant={isLoading ? 'secondary' : 'default'}
          className="transition-all duration-500 ease-in-out gap-1"
          type="submit"
          size="lg"
          onClick={() => {
            if (isLoading) {
              onStop && onStop();
            }
            if (text) {
              handleSend();
            }
          }}
        >
          {isLoading ? (
            <>
              {' '}
              <LoaderLine size={18} className="animate-spin mr-1" />
              Stop
            </>
          ) : (
            <>Chat</>
          )}
        </Button>
      }
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
              placeholder: () => placeholder ?? 'Ask sol...',
              includeChildren: true,
            }),
          ]}
          onCreate={async ({ editor }) => {
            setEditor(editor);
            await new Promise((resolve) => setTimeout(resolve, 100));
            editor.commands.focus('end');
          }}
          onUpdate={({ editor }) => {
            onUpdate(editor);
          }}
          shouldRerenderOnTransaction={false}
          editorProps={{
            attributes: {
              class: `prose prose-lg dark:prose-invert prose-headings:font-title font-default focus:outline-none max-w-full`,
            },
            handleKeyDown(view, event) {
              if (event.key === 'Enter' && !event.shiftKey) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const target = event.target as any;
                if (target.innerHTML.includes('suggestion')) {
                  return false;
                }
                event.preventDefault();
                if (text) {
                  handleSend();
                }
                return true;
              }

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
        />
      </EditorRoot>
    </ResourceUploader>
  );
}
