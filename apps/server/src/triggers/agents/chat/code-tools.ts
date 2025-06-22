import { PrismaClient } from '@prisma/client';
import { jsonSchema, tool } from 'ai';

const prisma = new PrismaClient();

export const claudeCodeTool = tool({
  description:
    'Use Claude code cli to analyze or modify code in a GitHub repository',
  parameters: jsonSchema({
    type: 'object',
    properties: {
      repo_url: {
        type: 'string',
        description: 'GitHub repository URL',
      },
      session_id: {
        type: 'string',
        description: 'Optional session ID for tracking conversation context',
      },
      branch_name: {
        type: 'string',
        description: 'Optional branch name to analyze or modify',
        default: 'main',
      },
      query: {
        type: 'string',
        description:
          'Detailed instructions for what to analyze or modify in the repository. Can be a request to understand code or make specific changes and create a PR.',
      },
    },
    required: ['repo_url', 'query'],
    additionalProperties: false,
  }),
});

export interface CheckErrors {
  error: string;
}

export const getGithubIntegrationToken = async (
  workspaceId: string,
): Promise<CheckErrors | string> => {
  const github = await prisma.integrationAccount.findFirst({
    where: {
      integrationDefinition: {
        slug: 'github',
      },
      workspaceId,
    },
  });

  if (!github) {
    return { error: 'Github is not configured.' };
  }

  return (github.integrationConfiguration as Record<string, string>)
    .access_token;
};

export const checkUserSessions = async (userId: string) => {
  const sessions = await prisma.userCodingSession.findMany({
    where: {
      userId,
    },
  });

  if (sessions.length > 3) {
    return {
      error: 'You can only run 3 session at once, please try again later',
    };
  }

  return sessions.length;
};
