/* eslint-disable @next/next/no-img-element */
import { ScrollArea } from '@redplanethq/ui';

import { Container, Footer, Header, Hero, Section } from '../components';

const Video = () => {
  return (
    <Section name="Video Demo" color="#1C91A8" id="video_demo">
      <Container className="flex flex-col items-center bg-background-3 shadow rounded p-2 !pt-2">
        <div className="w-full aspect-video">
          <iframe
            className="w-full h-full rounded"
            src="https://www.youtube.com/embed/LEyjZutXA38"
            title="SOL Demo Video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </Container>
    </Section>
  );
};

const Index = () => {
  return (
    <div className="flex min-h-svh h-[100vh] flex-col items-center justify-start bg-background overflow-hidden">
      <ScrollArea className="overflow-auto flex flex-col h-full w-full">
        <div className="p-6">
          <Header />
          <Hero />
          <Video />
        </div>
        <Footer />
      </ScrollArea>
    </div>
  );
};

export default Index;
