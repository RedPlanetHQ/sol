import { ArrowRight, Button } from '@redplanethq/ui';
import { Container } from '../components';

export const OpenSource = () => {
  const handleTryNow = () => {
    window.open('https://core.heysol.ai/', '_blank');
  };

  return (
    <section className="mt-10 lg-mt-20">
      <Container className="flex flex-col items-center">
        {/* Left: Text Content */}
        <div className="flex flex-col items-start py-4 gap-2 w-full">
          <h3 className="text-[24px] md:text-[32px] text-foreground mb-1 flex gap-1 items-center flex-wrap">
            Your Memory, powered by Open Source
          </h3>
          <p className="text-[16px] lg:text-[18px] text-muted-foreground/80 mb-4">
            CORE is proudly open source: transparent, extensible, and built with the community in mind.
          </p>

          <ul className="container flex flex-col gap-4 lg:grid lg:grid-cols-3 px-0">
            <li className="bg-background-3 p-4 rounded flex flex-col">
              <h1 className="text-[18px] mb-2">🔍 Transparent by Design</h1>
              <p className="text-md mb-4 flex-grow">
                Know exactly how your memory works; inspect, audit, and trust every layer.
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open('https://github.com/RedPlanetHQ/core', '_blank')}
              >
                Check Repo
              </Button>
            </li>
            <li className="bg-background-3 p-4 rounded flex flex-col">
              <h1 className="text-[18px] mb-2">⚙️ Customizable</h1>
              <p className="text-md mb-4 flex-grow">
                Adapt and extend CORE to suit your own workflows, data sources, or agents.
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open('https://docs.heysol.ai/core/overview', '_blank')}
              >
                Check Docs
              </Button>
            </li>
            <li className="bg-background-3 p-4 rounded flex flex-col">
              <h1 className="text-[18px] mb-2">🤝 Community-Powered</h1>
              <p className="text-md mb-4 flex-grow">
                Join the growing community of contributors shaping the future of AI memory.
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open('https://discord.gg/YGUZcvDjUa', '_blank')}
              >
                Join Discord
              </Button>
            </li>
          </ul>

          <div className="w-full flex flex-col items-center mt-10">
            <p className="text-center text-lg mb-6">
              ❤️ Built with love by the community, for the future of AI memory.
            </p>
            <Button
              className="p-4 rounded-lg"
              size="2xl"
              style={{ backgroundColor: '#C15E50', color: 'white' }}
              onClick={handleTryNow}
            >
              Try now <ArrowRight size={14} className="ml-2" />
            </Button>
          </div>
        </div>
      </Container>
    </section>
  );
}; 