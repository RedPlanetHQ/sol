/* eslint-disable @next/next/no-img-element */
import Image from 'next/image';

export function Footer() {
  return (
    <footer className="w-full flex flex-col relative">
      <img
        src="/footer.svg"
        alt="logo"
        className="w-full h-[450px] object-cover bg-transparent opacity-60"
      />
      <div className="flex flex-col items-center justify-end z-10 absolute inset-0 pb-4">
        <div className="flex flex-col gap-1 rounded items-center justify-center py-4">
          <div className="flex items-center gap-2 shrink-0">
            <Image src="/logo_light.svg" alt="logo" width={48} height={48} />
          </div>

          <div className="text-sm mx-4">
            © {new Date().getFullYear()} RedplanetHQ. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
