import { Button } from '@redplanethq/ui';
import Image from 'next/image';

export const Header = () => {
  // Scroll handler for feature buttons
  const handleScroll = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    } else {
      console.warn(`Section with id '${id}' not found.`);
    }
  };

  return (
    <header className="sticky z-1000 transition-all duration-300 ease-out top-0 translate-y-none bg-background-2">
      <div className="pt-3 pb-6 md:pb-2 mx-auto max-w-5xl w-full flex gap-2 justify-between items-center bg-background-2">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <Image src="/logo_light.svg" alt="logo" width={30} height={30} />
        </div>
        {/* Nav Links */}
        <nav className="flex-1 flex justify-start gap-2  items-center">
          {/* Features Dropdown */}
          <Popover>
            <PopoverTrigger>
              <Button variant="ghost"> Features</Button>
            </PopoverTrigger>

            <PopoverContent className="p-2 w-30">
              <div className="flex flex-col gap-1 w-full">
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => handleScroll('personalisation')}
                >
                  Personalisation
                </Button>

                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => handleScroll('task_management')}
                >
                  Task management
                </Button>

                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => handleScroll('chat')}
                >
                  Chat
                </Button>

                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => handleScroll('opensource')}
                >
                  Opensource
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <Button
            variant="ghost"
            onClick={() =>
              window.open('https://github.com/tegonhq/sigma', '_blank')
            }
          >
            Github
          </Button>

          <Button
            variant="ghost"
            onClick={() =>
              window.open('https://discord.gg/dVTC3BmgEq', '_blank')
            }
          >
            Discord
          </Button>
        </nav>
        {/* Right Side: Download only */}
        <div className="flex items-center gap-2">
          <DownloadButton />
        </div>
      </div>
    </header>
  );
};
