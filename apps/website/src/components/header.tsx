import { Button } from '@redplanethq/ui';
import { RiGithubFill } from '@remixicon/react';
import Image from 'next/image';

import { DownloadButton } from './utils';

export const Header = () => {
  return (
    <header className="sticky z-1000 transition-all duration-300 ease-out top-0 translate-y-none w-full bg-background">
      <div className="pb-6 md:pb-2 mx-auto max-w-3xl w-full flex gap-2 justify-between items-center">
        {/* Logo */}

        <div className="flex items-center gap-2 shrink-0">
          <Image src="/logo_light.svg" alt="logo" width={48} height={48} />{' '}
          <div className="font-mono mr-2 text-lg">SOL</div>
        </div>

        {/* Right Side: Download only */}
        <div className="flex items-center gap-1">
          <Button
            size="lg"
            variant="secondary"
            className="gap-2 items-center w-fit"
            onClick={() =>
              window.open('https://github.com/RedPlanetHQ/sol', '_blank')
            }
          >
            <RiGithubFill size={20} />
            Star us
          </Button>
          <DownloadButton />
        </div>
      </div>
    </header>
  );
};
