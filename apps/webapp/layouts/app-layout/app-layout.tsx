import { Button } from '@redplanethq/ui';
import Image from 'next/image';
import { useRouter } from 'next/router';

import { AIThinking } from 'modules/ai-thinking';
import { Updates } from 'modules/updates/updates';

import { RightSideLayout } from 'layouts/right-side-layout';

import { useIPC } from 'hooks/ipc';

import { AppTabs } from './app-tabs';
import { signOut } from 'common/lib/auth-client';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const ipc = useIPC();
  const { replace } = useRouter();

  if (!ipc) {
    return (
      <div className="flex flex-col">
        <div className="flex gap-2">
          <Image
            src="/logo_light.svg"
            alt="logo"
            key={1}
            width={20}
            height={20}
          />
          You can access in the App
        </div>
        <div className="flex justify-center mt-2">
          <Button
            variant="secondary"
            onClick={async () => {
              await signOut(ipc);

              replace('/auth');
            }}
          >
            Log out
          </Button>
        </div>
      </div>
    );
  }

  return (
    <RightSideLayout>
      <div className="h-[100vh]">
        <div className="top-0 z-10 w-full flex justify-start">
          <div className="flex items-center w-full">
            <div className="flex items-center justify-center overflow-hidden pb-1 w-full">
              <div className="flex items-center w-full rounded-md">
                <AppTabs />
              </div>
            </div>
          </div>
        </div>

        <div className="h-[calc(100vh_-_54px)] flex flex-col overflow-hidden">
          <div className="h-full w-full overflow-hidden">{children}</div>
        </div>
        <AIThinking />
        <Updates />
      </div>
    </RightSideLayout>
  );
}
