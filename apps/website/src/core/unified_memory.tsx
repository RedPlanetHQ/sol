import { ArrowRight } from '@redplanethq/ui';
import { Container } from '../components';

export const UnifiedMemory = () => {
  return (
    <section className="mt-10 lg-mt-20">
      <Container className="flex flex-col items-center">
        <div className="flex flex-col items-start py-4 gap-2 w-full">
          <h3 className="text-[24px] md:text-[32px] text-foreground mb-1 flex gap-1 items-center flex-wrap">
            Unified & portable memory
          </h3>
          <p className="text-[16px] lg:text-[18px] text-muted-foreground/80 mb-4">
            Say it once, remember it everywhere. CORE gives you a portable, relational memory you control.
          </p>

          <div className="md:grid grid-cols-2 gap-8 pt-8">
            <div className="mb-8 md:mb-0">
              <div className="inline-block max-w-[494px] md:ml-8">
                <img
                  src="/memory graph.gif"
                  alt="memory graph gif"
                  className="w-full rounded shadow-lg"
                  style={{ background: '#eee' }}
                />
              </div>
            </div>

            <div className="text-lg mt-6">
              <p className="mb-2 font-bold">Key Features</p>
              <ul className="p-0 mb-8 flex flex-col gap-2">
                <li className="list-none relative flex gap-2 items-center">
                  <span>
                    <ArrowRight size={16} />
                  </span>
                  <p><b>Unified & Portable</b>: Connect across Claude, Cursor, Linear etc.</p>
                </li>
                <li className="list-none relative flex gap-2 items-center">
                  <span>
                    <ArrowRight size={16} />
                  </span>
                  <p><b>Relational</b>: Not just facts, CORE captures how they connect, relate, and evolve.</p>
                </li>
                <li className="list-none relative flex gap-2 items-center">
                  <span>
                    <ArrowRight size={16} />
                  </span>
                  <p><b>User-Owned</b>: You control what’s kept, shared, or deleted</p>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}; 