import { CoreHeader } from './header';
import { CoreHero } from './hero';
import { CoreFooter } from './footer';
import { UnifiedMemory } from './unified_memory';
import { Container } from '../components';
import { Button } from '@redplanethq/ui';
import Image from 'next/image';
import { useState } from 'react';
import { Dialog, DialogContent } from '@redplanethq/ui';

const CorePage = () => {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col items-center justify-start bg-background-2">
      <CoreHeader />
      <CoreHero />
      <UnifiedMemory />
      {/* Video Section */}
      <Container className="flex flex-col items-center rounded p-2 mt-6">
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
      </Container>
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
      <CoreFooter />
    </div>
  );
};

export default CorePage; 