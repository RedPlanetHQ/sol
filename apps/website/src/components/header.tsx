import { useEffect, useRef, useState } from 'react';
import { Button } from '@redplanethq/ui';
import { RiGithubFill } from '@remixicon/react';
import Image from 'next/image';

import { DownloadButton } from './utils';

export const Header = () => {
  const headerRef = useRef<HTMLHeadingElement>(null);
  const [isSticky, setIsSticky] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (!headerRef.current) return;
      // Check if the header is at the top of the viewport
      const { top } = headerRef.current.getBoundingClientRect();
      setIsSticky(top <= 0);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Initial check in case page is already scrolled
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      ref={headerRef}
      className={`sticky z-1000 transition-all duration-300 ease-out top-0 translate-y-none w-full bg-background-2 py-2 ${
        isSticky ? 'shadow' : ''
      }`}
    >
      <div className="mx-auto max-w-5xl w-full flex gap-2 justify-between items-center">
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
