import type { ReactNode } from 'react';

import { cn, Tooltip, TooltipContent, TooltipTrigger } from '@redplanethq/ui';

interface TooltipWrapperProps {
  tooltip: ReactNode;
  children: ReactNode;
  className?: string;
  tooltipClassName?: string;
  disabled?: boolean;
}

export function TooltipWrapper({
  tooltip,
  children,
  className,
  tooltipClassName,
  disabled = false,
}: TooltipWrapperProps) {
  // If no tooltip is provided or wrapper is disabled, return just the children
  if (!tooltip || disabled) {
    return <div className={cn(className)}>{children}</div>;
  }

  return (
    <Tooltip delayDuration={300} disableHoverableContent>
      <TooltipTrigger asChild>
        <div className={cn(className, 'flex items-center')}>{children}</div>
      </TooltipTrigger>
      <TooltipContent
        className={cn('p-2 max-w-[300px]', tooltipClassName)}
        side="bottom"
      >
        <span className="font-mono">{tooltip}</span>
      </TooltipContent>
    </Tooltip>
  );
}
