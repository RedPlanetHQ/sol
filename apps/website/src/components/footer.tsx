/* eslint-disable @next/next/no-img-element */
import Image from 'next/image';

export function Footer() {
  return (
    <footer className="w-full flex flex-col relative">
      <img
        src="/footer.svg"
        alt="logo"
        className="w-full h-full min-h-[450px] object-cover opacity-70"
      />
      <div className="flex flex-col items-center justify-end z-10 absolute inset-0 pb-4">
        <div className="flex flex-col gap-1 rounded items-center justify-center py-4">
          <div className="flex items-center gap-2 shrink-0">
            <Image src="/logo_light.svg" alt="logo" width={48} height={48} />
          </div>

          <div className="text-base mx-4 mb-1 text-center font-mono">
            Be among the first explorers—join our crew and get early access
          </div>
          
          <div className="flex gap-6 my-3">
            <a href="/" className="text-foreground hover:text-primary transition-colors">
              Home
            </a>
            <a href="/changelog" className="text-foreground hover:text-primary transition-colors">
              Changelog
            </a>
            <a 
              href="https://github.com/RedPlanetHQ/sol" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-foreground hover:text-primary transition-colors"
            >
              GitHub
            </a>
          </div>
          
          <div className="text-sm mx-4">
            © {new Date().getFullYear()} RedplanetHQ. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
