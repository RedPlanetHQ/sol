import { Button } from '@redplanethq/ui';
import Image from 'next/image';
import { Container, Section } from '../components';

export const MemorySection = () => {
  return (
    <Section name="Memory" color="#4187C0" id="memory-section">
      <Container className="flex flex-col md:flex-row items-center bg-background-3 shadow rounded !pt-0">
        {/* Left: Text Content */}
        <div className="flex flex-col items-start p-4 gap-2 flex-1">
          <h3 className="text-2xl font-semibold text-foreground mb-1 text-center flex gap-1 items-center flex-wrap">
            SOL Deeply Understands You
          </h3>
          <p className="text-md text-muted-foreground text-start mb-4">
            SOL&apos;s CORE memory visually maps every interaction — enabling truly personalized, intelligent responses.
          </p>
          <blockquote className="relative p-3 my-2 rounded text-sm text-foreground font-mono bg-background-2 border-l-4" style={{ borderImage: 'linear-gradient(to bottom right, #c15e50, #c15042 90%) 1' }}>
            SOL 21: SOL bumps an overlooked JIRA bug to the top of my queue because it remembers I fixed the same module last month
          </blockquote>
          <Button
            size="lg"
            variant="default"
            className="gap-2 items-center w-fit !bg-white text-black"
            onClick={() => window.open('https://docs.heysol.ai/core/overview', '_blank')}
          >
            Explore CORE
          </Button>
        </div>
        {/* Right: Image */}
        <div className="flex-1 flex justify-center items-center p-4">
          <Image
            src="/memory.png"
            alt="CORE memory visual"
            width={400}
            height={300}
            className="rounded shadow-lg object-contain"
          />
        </div>
      </Container>
    </Section>
  );
};
