/* eslint-disable @next/next/no-img-element */
import { ArrowRight } from '@redplanethq/ui';
import Image from 'next/image';

import { Container, Section } from '../components';

export const CommandCentre = () => {
  return (
    <Section
      name="Command"
      color="#4187C0"
      id="personalisation"
      className="mt-10 lg-mt-20"
    >
      <Container className="flex flex-col items-center">
        <div className="flex flex-col items-start py-4 gap-2 w-full">
          <h3 className="text-[32px] md:text-[48px] text-foreground mb-1 flex gap-1 items-center flex-wrap">
            All your work, One Unified Command Centre
          </h3>
          <p className="text-[16px] lg:text-[18px] text-muted-foreground/80 mb-4">
            SOL brings together tasks, alerts, and requests from Slack, Gmail,
            GitHub, and Linear automatically surfacing what matters and planning
            your day around your top priorities.
          </p>

          <div className="md:grid grid-cols-2 gap-8 pt-8">
            <div className="mb-8 md:mb-0">
              <div className="inline-block max-w-[494px] md:ml-8">
                <Image
                  src="/command.png"
                  alt="logo"
                  key={1}
                  width={150}
                  height={150}
                  className="w-full"
                />
              </div>
            </div>

            <div className="text-lg mt-6">
              <p className="mb-2 font-bold"> Examples </p>
              <ul className="p-0 mb-8 flex flex-col gap-2">
                <li className="list-none relative flex gap-2 items-center">
                  <span>
                    <ArrowRight size={16} />
                  </span>
                  <p>
                    Unified Tracking: Instantly see every PR and Linear issues
                    in SOL
                  </p>
                </li>

                <li className="list-none relative flex gap-2 items-center">
                  <span>
                    <ArrowRight size={16} />
                  </span>
                  <p>
                    Smart Tasks: SOL auto-creates actions from Slack and email
                  </p>
                </li>

                <li className="list-none relative flex gap-2 items-center">
                  <span>
                    <ArrowRight size={16} />
                  </span>
                  <p>
                    Daily Planning: Focus on today’s top priorities, planned for
                    you
                  </p>
                </li>

                <li className="list-none relative flex gap-2 items-center">
                  <span>
                    <ArrowRight size={16} />
                  </span>
                  <p>
                    Instant Alerts: Get urgent, actionable notifications in
                    real-time
                  </p>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
};
