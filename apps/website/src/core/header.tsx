import { Button } from '@redplanethq/ui';
import { RiGithubFill } from '@remixicon/react';
import Image from 'next/image';

export const CoreHeader = () => {
  return (
    <header
      className="sticky top-0 z-10 transition-all duration-300 ease-out w-full bg-background-2 py-2"
    >
      <div className="mx-auto max-w-5xl w-full flex gap-2 justify-between items-center">
        {/* Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <Image src="/core_logo.png" alt="CORE logo" width={32} height={32} />{' '}
          <div className="font-mono mr-2 text-lg">CORE</div>
        </div>

        {/* Right Side: Star and Try Now */}
        <div className="flex items-center gap-1">
          <Button
            size="lg"
            variant="secondary"
            className="gap-2 items-center w-fit"
            onClick={() => window.open('https://github.com/RedPlanetHQ/core', '_blank')}
          >
            <RiGithubFill size={20} />
            Star us
          </Button>
          <Button
            size="lg"
            variant="default"
            style={{ backgroundColor: '#C15E50', color: 'white' }}
            className="gap-2 items-center w-fit"
            onClick={() => window.open('https://core.heysol.ai/', '_blank')}
          >
            Try now
          </Button>
        </div>
      </div>
    </header>
  );
}; 