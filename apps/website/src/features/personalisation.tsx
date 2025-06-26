import { Container, Section } from '../components';

export const Personalisation = () => {
  return (
    <Section name="Personalisation" color="#4187C0" id="personalisation">
      <Container className="flex flex-col items-center bg-background-3 shadow rounded !pt-0">
        <div className="flex flex-col items-start p-4 gap-2 w-full">
          <h3 className="text-2xl font-semibold text-foreground mb-1 text-center flex gap-1 items-center flex-wrap">
            Your Command Centre for Work
          </h3>
          <ul className="list-disc ml-6 mt-2 text-md text-muted-foreground space-y-2">
            <li>Smart task manager: All your tasks, auto-collated in one place</li>
            <li>Unified answers: Instantly tap GitHub, Linear, Sentry, and Slack</li>
            <li>Peer programmer: Assign coding tasks to Claude code for fast results</li>
          </ul>
        </div>
      </Container>
    </Section>
  );
};
