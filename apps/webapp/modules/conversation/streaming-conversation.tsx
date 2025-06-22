import { EditorContent, useEditor } from '@tiptap/react';
import React from 'react';

import { extensionsForConversation } from 'common/editor';

import { ConversationContext } from './conversation-context';
import { skillExtension } from './skill-extension';
import { CustomMention } from './suggestion-extension';
import { useTriggerStream } from './use-trigger-stream';

interface StreamingConversationProps {
  runId: string;
  token: string;
  conversationHistoryId: string;
  afterStreaming: () => void;
}

export const StreamingConversation = ({
  runId,
  token,
  afterStreaming,
  conversationHistoryId,
}: StreamingConversationProps) => {
  const { message, isEnd, actionMessages } = useTriggerStream(runId, token);
  const [loadingText, setLoadingText] = React.useState('Thinking...');

  const loadingMessages = [
    'Thinking...',
    'Still thinking...',
    'Deep in thought...',
    'Processing at light speed...',
    'Loading SOL...',
    'Establishing Mars connection...',
    'Consulting the Martian archives...',
    'Calculating in Mars time...',
    'Warming up the quantum processors...',
    'Checking atmospheric conditions on Mars...',
    'Untangling red planet algorithms...',
    'Just need my Mars-roasted coffee...',
  ];

  const messagesEditor = useEditor({
    extensions: [...extensionsForConversation, skillExtension, CustomMention],
    editable: false,
    content: '',
  });

  React.useEffect(() => {
    if (message) {
      messagesEditor?.commands.setContent(message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message]);

  React.useEffect(() => {
    if (isEnd) {
      afterStreaming();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEnd]);

  React.useEffect(() => {
    let currentIndex = 0;
    let delay = 5000; // Start with 2 seconds for more thinking time

    const updateLoadingText = () => {
      if (!message) {
        setLoadingText(loadingMessages[currentIndex]);
        currentIndex = (currentIndex + 1) % loadingMessages.length;
        delay = Math.min(delay * 1.3, 8000); // Increase delay more gradually
        setTimeout(updateLoadingText, delay);
      }
    };

    const timer = setTimeout(updateLoadingText, delay);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message]);

  return (
    <div className="flex gap-2 py-4 px-5">
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-1">
          <ConversationContext.Provider
            value={{ conversationHistoryId, streaming: true, actionMessages }}
          >
            {message ? (
              <EditorContent
                editor={messagesEditor}
                className="text-foreground"
              />
            ) : (
              <div className="text-foreground italic">{loadingText}</div>
            )}
          </ConversationContext.Provider>
        </div>
      </div>
    </div>
  );
};
