/* eslint-disable @next/next/no-img-element */
import {
  AddLine,
  ArrowRight,
  Button,
  Input,
  ScrollArea,
  SearchLine,
} from '@redplanethq/ui';
import { Dialog, DialogContent } from '@redplanethq/ui';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { CommandCentre } from 'src/features/command_centre';

import { Container, Footer, Header, Hero } from '../components';
import { BusyWork } from 'src/features/busy_work';
import { Peer } from 'src/features/peer';

const prompts = [
  'Create a task to review PR',
  'Add tasks: update docs, fix bug',
  'What does this repo do?',
  'Show Linear project status',
  'Debug the login issue in this repo',
];

function useTypewriter(
  phrases: string[],
  typingSpeed = 60,
  pause = 1200,
  deletingSpeed = 30,
) {
  const [display, setDisplay] = useState('');
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [typing, setTyping] = useState(true);
  const [charIdx, setCharIdx] = useState(0);

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    if (typing) {
      if (charIdx < phrases[phraseIdx].length) {
        timeout = setTimeout(() => {
          setDisplay((prev) => prev + phrases[phraseIdx][charIdx]);
          setCharIdx((idx) => idx + 1);
        }, typingSpeed);
      } else {
        timeout = setTimeout(() => setTyping(false), pause);
      }
    } else if (charIdx > 0) {
      timeout = setTimeout(() => {
        setDisplay((prev) => prev.slice(0, -1));
        setCharIdx((idx) => idx - 1);
      }, deletingSpeed);
    } else {
      setTyping(true);
      setPhraseIdx((idx) => (idx + 1) % phrases.length);
    }

    return () => clearTimeout(timeout);
  }, [typing, charIdx, phraseIdx, phrases, typingSpeed, pause, deletingSpeed]);

  return display;
}

const DemoVideo = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Container className="flex flex-col items-center rounded p-2">
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
              style={{ objectFit: 'cover' }}
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
                <polygon points="13,10 23,16 13,22" fill="white" />
              </svg>
            </span>
          </div>
          <div className="px-2">Watch demo</div>
        </Button>
      </Container>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="fixed inset-0 flex items-center justify-center z-50 bg-transparent shadow-none p-0">
          <div className="relative w-[90vw] max-w-[560px] aspect-video bg-black rounded-lg overflow-hidden">
            <iframe
              src="https://www.youtube.com/embed/LEyjZutXA38?autoplay=1"
              title="Demo Video"
              allow="autoplay; encrypted-media"
              allowFullScreen
              className="w-full h-full"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

const InputContainer = () => {
  const typewriterValue = useTypewriter(prompts);

  return (
    <div className="flex flex-col w-full items-center mt-10 text-sm">
      <div className="p-1 bg-background-3 max-w-[70ch] w-full rounded-lg flex flex-col gap-1 shadow">
        <div className="flex items-center p-2 px-3 pb-1">
          <SearchLine size={18} className="text-muted-foreground" />
          <Input
            value={typewriterValue}
            placeholder="Search or Ask sol"
            className="bg-transparent !cursor-pointer text-md !text-foreground pl-2"
            style={{ fontFamily: 'inherit' }}
          />
        </div>
        <div className="flex justify-between p-2 pl-3.5 pt-1 items-center">
          <div className="flex gap-2 text-muted-foreground/50 items-center">
            <AddLine size={16} /> Add files
          </div>
          <Button size="lg" variant="secondary">
            Chat
          </Button>
        </div>
      </div>
    </div>
  );
};

const Index = () => {
  return (
    <div className="flex min-h-svh h-[100vh] flex-col items-center justify-start overflow-hidden bg-background-2">
      <ScrollArea className="overflow-auto flex flex-col h-full w-full">
        <div className="p-6">
          <Header />
          <Hero />
          <InputContainer />
          <DemoVideo />
          {/* <Video /> */}
          <CommandCentre />
          <BusyWork />
          <Peer />
          {/* <MemorySection /> */}
        </div>
        <Footer />
      </ScrollArea>
    </div>
  );
};

export default Index;
