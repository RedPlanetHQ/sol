import { cn } from '@redplanethq/ui';
import React, { useEffect, useRef } from 'react';

interface AdjustableTextareaProps {
  className?: string;
  placeholderClassName?: string;
  onChange: (text: string) => void;
  value?: string;
  placeholder?: string;
  autoFocus?: boolean;
}

export const AdjustableTextArea = ({
  className,
  placeholderClassName,
  onChange,
  value,
  placeholder,
  autoFocus,
}: AdjustableTextareaProps) => {
  const divRef = useRef<HTMLDivElement>(null);

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    onChange(e.currentTarget.textContent || '');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Your custom code here
    }
  };

  // Set focus on the div when autoFocus is true
  useEffect(() => {
    if (autoFocus && divRef.current) {
      divRef.current.focus();
    }
  }, [autoFocus]);

  // Update div content when state changes (sets the value)
  useEffect(() => {
    if (divRef.current && divRef.current.textContent !== value) {
      divRef.current.textContent = value;
    }
  }, [value]);

  return (
    <div className="relative w-fit min-w-[80px]">
      <span
        className={`absolute z-1 left-0 top-1 text-muted-foreground ${value ? 'hidden' : ''} ${placeholderClassName}`} // Placeholder styling
      >
        {placeholder}
      </span>
      <div
        ref={divRef}
        contentEditable
        suppressContentEditableWarning
        className={cn(
          className,
          'w-full z-10 relative resize-none overflow-hidden whitespace-pre-wrap break-words focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        )}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
};
