import { Button } from '@redplanethq/ui';
import { RiGithubFill } from '@remixicon/react';
import Image from 'next/image';
import { useRef } from 'react';

import { DownloadButton } from './utils';

export const Header = () => {
  const headerRef = useRef<HTMLHeadingElement>(null);

  return (
    <header
      ref={headerRef}
      className={`sticky z-10 transition-all duration-300 ease-out top-0 translate-y-none w-full bg-background-2 py-2`}
    >
      <div className="mx-auto max-w-5xl w-full flex gap-2 justify-between items-center">
        {/* Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <Image src="/logo_light.svg" alt="logo" width={48} height={48} />{' '}
          <div className="font-mono mr-2 text-lg">SOL</div>
        </div>

        {/* Right Side: Links and Download */}
        <div className="flex items-center gap-3">
          <nav className="hidden md:flex items-center gap-6 mr-2">
            <a href="/" className="text-foreground hover:text-primary transition-colors">
              Home
            </a>
            <a href="/changelog" className="text-foreground hover:text-primary transition-colors">
              Changelog
            </a>
          </nav>
          
          <Button
            size="lg"
            variant="ghost"
            className="gap-2 items-center w-fit"
            onClick={() => window.location.href = '/core'}
          >
            CORE
          </Button>
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
