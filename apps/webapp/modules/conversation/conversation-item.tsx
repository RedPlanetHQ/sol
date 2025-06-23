/* eslint-disable @next/next/no-img-element */
import { cn } from '@redplanethq/ui';
import { UserTypeEnum } from '@sol/types';
import { EditorContent, useEditor } from '@tiptap/react';
import { observer } from 'mobx-react-lite';
import React, { useEffect } from 'react';

import { extensionsForConversation } from 'common/editor';

import { useIPC } from 'hooks/ipc';
import { useIsElectron } from 'hooks/use-is-electron';

import { useContextStore } from 'store/global-context-provider';

import { ConversationContext } from './conversation-context';
import { skillExtension } from './skill-extension';
import { CustomMention } from './suggestion-extension';

interface AIConversationItemProps {
  conversationHistoryId: string;
}

interface Resource {
  id: string;
  size: number;
  fileType: string;
  publicURL: string;
  originalName: string;
}

export const ConversationItem = observer(
  ({ conversationHistoryId }: AIConversationItemProps) => {
    const { conversationHistoryStore } = useContextStore();
    const ipc = useIPC();

    const conversationHistory =
      conversationHistoryStore.getConversationHistoryForId(
        conversationHistoryId,
      );
    const isUser =
      conversationHistory.userType === UserTypeEnum.User ||
      conversationHistory.userType === UserTypeEnum.System;

    const id = `a${conversationHistory.id.replace(/-/g, '')}`;

    const editor = useEditor({
      extensions: [...extensionsForConversation, skillExtension, CustomMention],
      editable: false,
      content: conversationHistory.message,
    });

    useEffect(() => {
      editor?.commands.setContent(conversationHistory.message);

      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, conversationHistory.message]);

    if (!conversationHistory.message) {
      return null;
    }

    const getResources = () => {
      const context = conversationHistory.context;
      try {
        const contextParsed = JSON.parse(context);
        return contextParsed.resources ?? [];
      } catch (e) {
        return [];
      }
    };

    const resources = getResources();

    // Replace app.heysol.ai URLs with empty string for Electron app (creating a relative path)
    const isElectron = useIsElectron();
    const getLocalUrl = (url: string) => {
      if (url && typeof url === 'string' && isElectron) {
        return url.replace('https://app.heysol.ai', '');
      }
      return url;
    };

    const handleResourceClick = (url: string) => {
      ipc.openUrl(getLocalUrl(url));
    };

    return (
      <div className={cn('flex gap-2 pb-2 px-4', isUser && 'justify-end my-4')}>
        <div
          className={cn(
            'flex flex-col',
            isUser && 'bg-primary/20 p-3 max-w-[500px] rounded-md',
          )}
        >
          <ConversationContext.Provider value={{ conversationHistoryId }}>
            <EditorContent editor={editor} />
          </ConversationContext.Provider>

          {resources.length > 0 && (
            <div className="flex flex-wrap gap-3 mt-3">
              {resources.map((resource: Resource, index: number) => (
                <div
                  key={index}
                  className="relative group cursor-pointer"
                  onClick={() => handleResourceClick(resource.publicURL)}
                >
                  {resource.fileType === 'application/pdf' ? (
                    <div className="w-10 h-10 flex items-center justify-center bg-grayAlpha-100 rounded hover:bg-grayAlpha-200">
                      <span className="text-sm">PDF</span>
                    </div>
                  ) : resource.fileType.startsWith('image/') ? (
                    <img
                      src={getLocalUrl(resource.publicURL)}
                      alt={resource.originalName}
                      className="w-10 h-10 object-cover rounded hover:opacity-90"
                    />
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  },
);
