import type { ViewUpdate } from '@codemirror/view';
import type {
  ReactCodeMirrorProps,
  UseCodeMirror,
} from '@uiw/react-codemirror';

import { json as jsonLang } from '@codemirror/lang-json';
import { Button, cn } from '@tegonhq/ui';
import { useCodeMirror } from '@uiw/react-codemirror';
import { useCallback, useEffect, useRef, useState } from 'react';

import { getEditorSetup } from './editor-setup';
import { lightTheme } from './theme';

export interface JSONEditorProps extends Omit<ReactCodeMirrorProps, 'onBlur'> {
  defaultValue?: string;
  language?: 'json';
  readOnly?: boolean;
  onChange?: (value: string) => void;
  onUpdate?: (update: ViewUpdate) => void;
  onBlur?: (code: string) => void;
  showCopyButton?: boolean;
  showClearButton?: boolean;
}

const languages = {
  json: jsonLang,
};

type JSONEditorDefaultProps = Partial<JSONEditorProps>;

const defaultProps: JSONEditorDefaultProps = {
  language: 'json',
  readOnly: true,
  basicSetup: false,
};

export function JSONEditor(opts: JSONEditorProps) {
  const {
    defaultValue = '',
    language,
    readOnly,
    onChange,
    onUpdate,
    onBlur,
    basicSetup,
    autoFocus,
    showCopyButton = true,
    showClearButton = true,
  } = {
    ...defaultProps,
    ...opts,
  };

  const extensions = getEditorSetup();

  if (!language) {
    throw new Error('language is required');
  }
  const languageExtension = languages[language];

  extensions.push(languageExtension());

  const editor = useRef<HTMLDivElement>(null);
  const settings: Omit<UseCodeMirror, 'onBlur'> = {
    ...opts,
    container: editor.current,
    extensions,
    editable: !readOnly,
    contentEditable: !readOnly,
    value: defaultValue,
    autoFocus,
    theme: lightTheme(),
    indentWithTab: false,
    basicSetup,
    onChange,
    onUpdate,
  };
  const { setContainer, view } = useCodeMirror(settings);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (editor.current) {
      setContainer(editor.current);
    }
  }, [setContainer]);

  // if the defaultValue changes update the editor
  useEffect(() => {
    if (view !== undefined) {
      if (view.state.doc.toString() === defaultValue) {
        return;
      }
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: defaultValue },
      });
    }
  }, [defaultValue, view]);

  const clear = useCallback(() => {
    if (view === undefined) {
      return;
    }
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: undefined },
    });
    onChange?.('');
  }, [view]);

  const copy = useCallback(() => {
    if (view === undefined) {
      return;
    }
    navigator.clipboard.writeText(view.state.doc.toString());
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 1500);
  }, [view]);

  const showButtons = showClearButton || showCopyButton;

  return (
    <div
      className={cn(
        'grid border-1 border-border rounded',
        showButtons ? 'grid-rows-[2.5rem_1fr]' : 'grid-rows-[1fr]',
        opts.className,
      )}
    >
      {showButtons && (
        <div className="mx-3 flex items-center justify-end gap-2 border-b border-grid-dimmed">
          {showClearButton && (
            <Button
              type="button"
              variant="secondary"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                clear();
              }}
            >
              Clear
            </Button>
          )}
          {showCopyButton && (
            <Button
              type="button"
              variant="secondary"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                copy();
              }}
            >
              Copy
            </Button>
          )}
        </div>
      )}
      <div
        className="w-full overflow-auto"
        ref={editor}
        onBlur={() => {
          if (!onBlur) {
            return;
          }
          onBlur(editor.current?.textContent ?? '');
        }}
      />
    </div>
  );
}
