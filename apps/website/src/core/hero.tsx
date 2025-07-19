import { Button } from '@redplanethq/ui';
import { Container } from '../components';
import Image from 'next/image';
import { useState } from 'react';
import { Dialog, DialogContent } from '@redplanethq/ui';

export const CoreHero = () => {
  const handleTryNow = () => {
    window.open('https://core.heysol.ai/', '_blank');
  };
  const [open, setOpen] = useState(false);

  return (
    <section className="w-full">
      <Container className="flex flex-col items-center text-center w-full pt-10 lg:pt-15 h-full relative justify-center mx-auto">
        <div className="relative flex flex-wrap text-center justify-center text-[32px] lg:text-[54px] mt-5 lg:mt-10">
          Your
          <span
            className="mx-4 bg-gradient-to-br from-[#c15042] to-[#c15e50] bg-clip-text text-transparent animate-gradien"
            style={{
              backgroundSize: '200% 200%',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              animation: 'gradient-move 3s ease-in-out infinite',
            }}
          >
            digital brain
          </span>
          for AI era
        </div>

        <div className="text-lg lg:text-2xl text-muted-foreground mt-4 max-w-2xl">
          CORE is your shared memory across Cursor, Claude, ChatGPT and more; so you never repeat yourself.
        </div>

        {/* Demo Video Section */}
        <div className="flex flex-col items-center rounded p-2 mt-6">
          <Button
            onClick={() => setOpen(true)}
            className="flex items-center justify-betweeb transition p-2 h-18 gap-2 pr-2"
            variant="secondary"
            aria-label="Play video"
          >
            <div className="relative flex-shrink-0 overflow-hidden w-16 h-12">
              <Image
                src="/memory.png"
                alt="Demo video thumbnail"
                className="rounded"
                fill
                style={{ objectFit: 'contain' }}
                priority
              />
              <span className="absolute inset-0 flex items-center justify-center">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 32 32"
                  fill="white"
                  style={{
                    filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.25))',
                  }}
                  aria-hidden="true"
                >
                  <polygon points="13,10 23,16 13,22" fill="#C15E50" />
                </svg>
              </span>
            </div>
            <div className="px-2">Watch Demo Video</div>
          </Button>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="fixed inset-0 flex items-center justify-center z-50 bg-transparent shadow-none p-0">
            <div className="relative w-[90vw] max-w-[560px] aspect-video bg-black rounded-lg overflow-hidden">
              <iframe
                src="https://www.youtube.com/embed/iANZ32dnK60"
                title="Demo Video"
                allow="autoplay; encrypted-media"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
          </DialogContent>
        </Dialog>
      </Container>
    </section>
  );
}; 