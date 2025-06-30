import { ArrowRight, Button } from '@redplanethq/ui';

import { Container, Section } from '../components';

export const MemorySection = () => {
  const handleDownload = () => {
    const downloadUrl = `https://tally.so/r/mOKOp8`;
    window.open(downloadUrl, '_blank');
  };

  return (
    <Section name="Memory" color="#4187C0" id="memory-section">
      <Container className="flex flex-col items-center">
        {/* Left: Text Content */}
        <div className="flex flex-col items-start py-4 gap-2 w-full">
          <h3 className="text-[32px] md:text-[48px] text-foreground mb-1 flex gap-1 items-center flex-wrap">
            Think less, do more
          </h3>
          <p className="text-[16px] lg:text-[18px] text-muted-foreground/80 mb-4">
            SOL syncs your tasks, tools, and habits and handles the busywork for
            you.
          </p>

          <ul className="container flex flex-col gap-4 lg:grid lg:grid-cols-3 px-0">
            <li className="bg-background-3 p-4 rounded">
              <h1 className="text-[24px] mb-2">Memory that remembers</h1>
              <p className="text-md">
                SOL never forgets. It remembers your preferences, past actions,
                and context so it helps you better every time.
              </p>
            </li>
            <li className="bg-background-3 p-4 rounded">
              <h1 className="text-[24px] mb-2">Built-in Productivity</h1>
              <p className="text-md">
                Organize with ease. SOL includes smart tasks, lists, and views
                that keep your work structured by default.
              </p>
            </li>
            <li className="bg-background-3 p-4 rounded">
              <h1 className="text-[24px] mb-2">Open and Extensible</h1>
              <p className="text-md">
                SOL is open source, built to be extended and improved by a
                growing community of developers.
              </p>
            </li>
          </ul>

          <div className="w-full flex justify-center mt-10">
            <Button
              className="p-4 rounded-lg"
              size="2xl"
              onClick={handleDownload}
            >
              Join the wailist <ArrowRight size={14} className="ml-2" />
            </Button>
          </div>
        </div>
      </Container>
    </Section>
  );
};
