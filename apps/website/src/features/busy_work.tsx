/* eslint-disable @next/next/no-img-element */
import { ArrowRight } from '@redplanethq/ui';
import Image from 'next/image';

import { Container, Section } from '../components';

export const BusyWork = () => {
  return (
    <Section
      name="Busy work"
      color="#4187C0"
      id="busy_work"
      className="mt-10 lg-mt-20"
    >
      <Container className="flex flex-col items-center">
        <div className="flex flex-col items-start py-4 gap-2 w-full">
          <h3 className="text-[48px] text-foreground mb-1 flex gap-1 items-center flex-wrap">
            Get Busywork Done
          </h3>
          <p className="text-[16px] lg:text-[18px] text-muted-foreground/80 mb-4">
            Sol can answer everything and can take actions for you in Slack,
            Linear, Github, Calendar etc. Just say what you need, and SOL
            handles the rest.
          </p>

          <div className="flex flex-col md:grid md:grid-cols-2 gap-8 pt-8">
            {/* Image on top for mobile, on right for desktop */}
            <div className="mb-8 md:mb-0 order-1 md:order-2 flex justify-center md:block">
              <div className="inline-block max-w-[494px] md:ml-8">
                <Image
                  src="/busy.svg"
                  alt="logo"
                  key={1}
                  width={150}
                  height={150}
                  className="w-full relative -top-6"
                />
              </div>
            </div>
            <div className="text-lg order-2 md:order-1 mt-6">
              <p className="mb-2 font-bold"> Examples </p>
              <ul className="p-0 mb-8 flex flex-col gap-2">
                <li className="list-none relative flex gap-2 items-center">
                  <span>
                    <ArrowRight size={16} />
                  </span>
                  <p>Trigger: Auto add calendar holds for new code reviews</p>
                </li>

                <li className="list-none relative flex gap-2 items-center">
                  <span>
                    <ArrowRight size={16} />
                  </span>
                  <p>
                    Assist: Summarise all open linear issues assigned to you
                  </p>
                </li>

                <li className="list-none relative flex gap-2 items-center">
                  <span>
                    <ArrowRight size={16} />
                  </span>
                  <p>Delete: Delete local branches after PRs merge</p>
                </li>

                <li className="list-none relative flex gap-2 items-center">
                  <span>
                    <ArrowRight size={16} />
                  </span>
                  <p>Update: Mark Linear issues done when PRs merge</p>
                </li>

                <li className="list-none relative flex gap-2 items-center">
                  <span>
                    <ArrowRight size={16} />
                  </span>
                  <p>Fetch: Get error logs from the latest deployment</p>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
};
