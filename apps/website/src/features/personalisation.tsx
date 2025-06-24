import { Tabs, TabsList, TabsTrigger } from '@redplanethq/ui';

import { Container, Section } from '../components';

export const Personalisation = () => {
  return (
    <Section name="Personalisation" color="#4187C0" id="personalisation">
      <Container className="flex flex-col items-center bg-background-3 shadow rounded !pt-0">
        <div className="flex flex-col items-start p-4 gap-2">
          <h3 className="text-2xl font-semibold text-foreground mb-1 text-center flex gap-1 items-center flex-wrap max-w-[60%]">
            Never track tasks by hand again
          </h3>
          <p className="text-md text-muted-foreground text-start">
            SOL automatically pulls in every Slack mention, GitHub PR, Linear
            issues, Gmail request, and calendar event so you spend time doing,
            not listing.
          </p>

          <Tabs className="mt-2">
            <TabsList>
              <TabsTrigger value="daily_brief" className="">
                Daily Brief
              </TabsTrigger>
              <TabsTrigger value="code_reviews" className="">
                Smart Code Reviews
              </TabsTrigger>
              <TabsTrigger value="action_items" className="">
                Meeting → Action Items
              </TabsTrigger>
              <TabsTrigger value="automation" className="">
                Bug Fix Automation
              </TabsTrigger>
            </TabsList>
          </Tabs>
          {/* <ul className="list-disc ml-6 mt-2">
            <li>
              When a GitHub pull request or issue is assigned to me,
              automatically add a task in SOL.
            </li>
            <li>
              Turn each bookmarked Slack message into a SOL task for its action
              items.
            </li>
            <li>
              Post a comment on every new issue opened in redplanethq/sol.
            </li>
            <li>
              Turn each bookmarked Slack message into a SOL task for its action
              items.
            </li>
            <li>
              Post a comment on every new issue opened in redplanethq/sol.
            </li>
          </ul> */}
        </div>
      </Container>
    </Section>
  );
};
