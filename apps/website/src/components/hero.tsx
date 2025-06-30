import { ArrowRight, Button } from '@redplanethq/ui';

import { Container } from './utils';

export const Hero = () => {
  const handleDownload = () => {
    const downloadUrl = `https://tally.so/r/mOKOp8`;
    window.open(downloadUrl, '_blank');
  };

  return (
    <section className="w-full">
      <Container className="flex flex-col items-center text-center w-full pt-10 lg:pt-15 h-full relative justify-center mx-auto">
        <div className="relative flex flex-wrap text-center justify-center text-[32px] lg:text-[54px] mt-5 lg:mt-10">
          Your personal assistant for
          <span
            className="mx-4 bg-gradient-to-br from-[#c15042] to-[#c15e50] bg-clip-text text-transparent animate-gradien"
            style={{
              backgroundSize: '200% 200%',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              animation: 'gradient-move 3s ease-in-out infinite',
            }}
          >
            daily focus
          </span>
        </div>

        <div className="flex gap-1 mt-2">
          <Button
            className="p-4 rounded-lg"
            size="2xl"
            onClick={handleDownload}
          >
            Join the wailist <ArrowRight size={14} className="ml-2" />
          </Button>
        </div>
      </Container>
    </section>
  );
};
