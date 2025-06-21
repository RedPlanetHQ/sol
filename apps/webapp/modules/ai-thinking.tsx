import { observer } from 'mobx-react-lite';

import { useContextStore } from 'store/global-context-provider';

export const AIThinking = observer(() => {
  const { agentWorklogsStore } = useContextStore();
  const agentWorking = agentWorklogsStore.agentWorklogs.length > 0;

  if (!agentWorking) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 rounded-md bg-background-3 px-2 py-1 shadow h-7">
      <span
        className="text-sm font-medium text-muted-foreground bg-gradient-to-r from-[#F48FD7] via-[#6528FD] to-[#F48FD7] 
            bg-[length:200%_100%] bg-clip-text text-transparent animate-gradient-slide"
      >
        Thinking...
      </span>
    </div>
  );
});
