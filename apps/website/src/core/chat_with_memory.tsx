import { ArrowRight } from '@redplanethq/ui';
import { Container } from '../components';

export const ChatWithMemory = () => {
  return (
    <section className="mt-5 lg-mt-10">
      <Container className="flex flex-col items-center">
        <div className="flex flex-col items-start py-4 gap-2 w-full">
          <h3 className="text-[24px] md:text-[32px] text-foreground mb-1 flex gap-1 items-center flex-wrap">
            Chat with your memory
          </h3>
          <p className="text-[16px] lg:text-[18px] text-muted-foreground/80 mb-4">
            Ask. Recall. Reflect. CORE connects your context across time and tools.
          </p>

          <div className="flex flex-col md:grid md:grid-cols-2 gap-8 pt-8">
            {/* Image on top for mobile, on right for desktop */}
            <div className="mb-8 md:mb-0 order-1 md:order-2 flex justify-center md:block">
              <div className="inline-block max-w-[494px] md:ml-8">
                <img
                  src="/chat with memory.gif"
                  alt="chat with memory gif"
                  className="w-full rounded shadow-lg"
                  style={{ background: '#eee' }}
                />
              </div>
            </div>
            <div className="text-lg order-2 md:order-1 mt-6">
              <p className="mb-2 font-bold">Examples</p>
              <ul className="p-0 mb-8 flex flex-col gap-2">
                <li className="list-none relative flex gap-2 items-center">
                  <span>
                    <ArrowRight size={16} />
                  </span>
                  <p>Summarize my last few notes about Claude prompts</p>
                </li>
                <li className="list-none relative flex gap-2 items-center">
                  <span>
                    <ArrowRight size={16} />
                  </span>
                  <p>What trends are emerging from my daily standups?</p>
                </li>
                <li className="list-none relative flex gap-2 items-center">
                  <span>
                    <ArrowRight size={16} />
                  </span>
                  <p>What’s my preferred tone when replying to users?</p>
                </li>
                <li className="list-none relative flex gap-2 items-center">
                  <span>
                    <ArrowRight size={16} />
                  </span>
                  <p>What tasks did I complete related to Payments?</p>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}; 