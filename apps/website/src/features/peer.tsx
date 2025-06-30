/* eslint-disable @next/next/no-img-element */
import { ArrowRight } from '@redplanethq/ui';
import Image from 'next/image';

import { Container, Section } from '../components';

export const Peer = () => {
  return (
    <Section name="Peerk" color="#4187C0" id="peer" className="mt-10 lg-mt-20">
      <Container className="flex flex-col items-center">
        <div className="flex flex-col items-start py-4 gap-2 w-full">
          <h3 className="text-[32px] md:text-[48px] text-foreground mb-1 flex gap-1 items-center flex-wrap">
            Peer Programmer/ AI Coding Partner
          </h3>
          <p className="text-[16px] lg:text-[18px] text-muted-foreground/80 mb-4">
            SOL, powered by Claude Code, handles your coding tasks
            end-to-end—just assign, and SOL will generate code, create a branch
            and PR, and deliver everything right in chat.
          </p>

          <div className="md:grid grid-cols-2 gap-8 pt-8">
            <div className="mb-8 md:mb-0">
              <div className="inline-block max-w-[494px] md:ml-8">
                <Image
                  src="/peer.svg"
                  alt="logo"
                  key={1}
                  width={150}
                  height={150}
                  className="w-[70%] relative"
                />
              </div>
            </div>
            <div className="text-lg mt-6">
              <p className="mb-2 font-bold"> Examples </p>
              <ul className="p-0 mb-8 flex flex-col gap-2">
                <li className="list-none relative pl-2 flex gap-2 items-center">
                  <span>
                    <ArrowRight size={16} />
                  </span>
                  <p>Write or update docs from your task description</p>
                </li>

                <li className="list-none relative pl-2 flex gap-2 items-center">
                  <span>
                    <ArrowRight size={16} />
                  </span>
                  <p>Debug production issues </p>
                </li>

                <li className="list-none relative pl-2 flex gap-2 items-center">
                  <span>
                    <ArrowRight size={16} />
                  </span>
                  <p>Refactor code or migrate frameworks automatically</p>
                </li>

                <li className="list-none relative pl-2 flex gap-2 items-center">
                  <span>
                    <ArrowRight size={16} />
                  </span>
                  <p>Prototype new features from your requirements</p>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
};
