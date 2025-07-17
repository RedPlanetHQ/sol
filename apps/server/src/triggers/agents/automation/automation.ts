// apps/server/src/triggers/agents/automation/automation.ts
import { PrismaClient } from '@prisma/client';
import { task } from '@trigger.dev/sdk/v3';
import Handlebars from 'handlebars';
import { z } from 'zod';

import {
  AUTOMATION_ENHANCE_SYSTEM_PROMPT,
  AUTOMATION_ENHANCE_USER_PROMPT,
  MEMORY_PLANNING_PROMPT,
} from './prompt';
import { callSolTool } from '../sol-tools/sol-tools';
import { getContext } from '../utils/utils';

const prisma = new PrismaClient();

const AutomationEnhancePayload = z.object({
  automationId: z.string(),
  userInput: z.string(),
  workspaceId: z.string(),
  availableIntegrations: z.array(z.string()),
});

export const automationEnhancer = task({
  id: 'automation-enhancer',
  queue: {
    name: 'automation-enhancer',
    concurrencyLimit: 5,
  },
  run: async (payload: z.infer<typeof AutomationEnhancePayload>) => {
    const { automationId, userInput, availableIntegrations } = payload;

    try {
      //   // STEP 1: Plan memory searches based on automation request
      //   const memoryQueries = await planMemorySearch(userInput);

      //   // STEP 2: Search memory in parallel using existing SOL tools
      //   const memoryContext = await searchMemoryInParallel(memoryQueries);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const memoryContext: any[] = [];

      // STEP 3: Generate enhanced automation rule
      const enhancedRule = await generateEnhancedRule(
        userInput,
        memoryContext,
        availableIntegrations,
      );

      // STEP 4: Update automation in database
      await prisma.automation.update({
        where: { id: automationId },
        data: {
          title: enhancedRule.title,
          text: enhancedRule.detailedRule,
          mcps: enhancedRule.requiredIntegrations,
        },
      });

      return { success: true, enhancedRule };
    } catch (error) {
      console.error('Automation enhancement failed:', error);
      throw error;
    }
  },
});

// Helper function to plan memory searches
export async function planMemorySearch(userInput: string): Promise<string[]> {
  const response = await getContext([
    {
      role: 'system',
      content: MEMORY_PLANNING_PROMPT,
    },
    {
      role: 'user',
      content: `
      Here is the user's automation request:
<user_request>
${userInput}
</user_request>`,
    },
  ]);

  return JSON.parse(response.queries);
}

// Helper function to search memory in parallel
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function searchMemoryInParallel(queries: string[]): Promise<any> {
  try {
    // Use existing SOL memory tool with parallel queries
    const memoryResult = await callSolTool('sol--get_my_memory', {
      queries,
    });

    return JSON.parse(memoryResult);
  } catch (error) {
    console.log('Memory search failed, continuing without memory context');
    return [];
  }
}

// Helper function to generate enhanced rule
async function generateEnhancedRule(
  userInput: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  memoryContext: any,
  availableIntegrations: string[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  const userPromptHandler = Handlebars.compile(AUTOMATION_ENHANCE_USER_PROMPT);
  const userPrompt = userPromptHandler({
    USER_REQUEST: userInput,
    MEMORY_CONTEXT: JSON.stringify(memoryContext),
    AVAILABLE_INTEGRATIONS: availableIntegrations.join(', '),
  });

  const response = await getContext([
    {
      role: 'system',
      content: AUTOMATION_ENHANCE_SYSTEM_PROMPT,
    },
    {
      role: 'user',
      content: userPrompt,
    },
  ]);

  // Extract JSON from <output> tags
  const match = response.match(/<output>(.*?)<\/output>/s);
  return match ? JSON.parse(match[1]) : response;
}
