import { Badge } from '@redplanethq/ui';

import { Container, DownloadButton } from './utils';

export const Hero = () => {
  return (
    <section className="w-full">
      <Container className="mt-5 flex flex-col items-center p-2 !pt-2 w-full rounded shadow bg-background-3">
        <div className="flex flex-col bg-gradient-to-br from-[#c15e50] to-[#c15042]/90 rounded w-full items-center rounded p-7 py-10 justify-center h-full">
          <h1 className="text-[40px] font-normal text-center leading-tight mb-4 tracking-tight text-white max-w-[83%] md:max-w-[65%] rounded font-mono">
            Your 25-Hour-Day <br /> Personal Assistant
          </h1>
          <p className="text-lg text-center mb-8 font-normal text-white max-w-[83%] md:max-w-[65%]">
            SOL funnels Slack, Linear, Gmail & more into one feed flags what’s
            urgent and automates busywork.
          </p>

          <div className="flex flex-col md:flex-row gap-2">
            <DownloadButton />

            <div className="flex items-center ml-1 gap-1 text-white">
              Backed by{' '}
              <Badge className="bg-[#FF6600] text-white text-base font-mono">
                Y
              </Badge>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
};
