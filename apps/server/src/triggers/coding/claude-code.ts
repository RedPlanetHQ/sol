import { exec } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import util from 'util';

import { LLMMappings } from '@redplanethq/sol-sdk';
import { logger } from '@trigger.dev/sdk/v3';
import axios from 'axios';
import {
  getGithubIntegrationToken,
  CheckErrors,
  checkUserSessions,
} from 'triggers/agents/chat/code-tools';

import { query } from './query';

const execAsync = util.promisify(exec);

interface ClaudeCodeParams {
  workspaceId: string;
  userId: string;
  repo_url: string;
  query: string;
  session_id?: string;
  branch_name?: string;
}

// Utility function to mask API keys in content
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function maskApiKeys(content: any): any {
  if (!content) {
    return content;
  }

  // Deep clone to avoid modifying the original object
  const clonedContent = JSON.parse(JSON.stringify(content));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const maskSensitiveData = (obj: any) => {
    if (typeof obj !== 'object' || obj === null) {
      return;
    }

    // Recursively process objects and arrays
    if (Array.isArray(obj)) {
      obj.forEach((item) => maskSensitiveData(item));
      return;
    }

    for (const key in obj) {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        maskSensitiveData(obj[key]);
      } else if (typeof obj[key] === 'string') {
        // Mask OpenAI API keys (starting with 'sk-')
        if (/sk-[a-zA-Z0-9]{30,}/.test(obj[key])) {
          obj[key] = obj[key].replace(
            /sk-[a-zA-Z0-9]{30,}/g,
            'sk-***MASKED***',
          );
        }

        // Mask Anthropic API keys (typically starting with 'sk-ant-')
        if (/sk-ant-[a-zA-Z0-9]{30,}/.test(obj[key])) {
          obj[key] = obj[key].replace(
            /sk-ant-[a-zA-Z0-9]{30,}/g,
            'sk-ant-***MASKED***',
          );
        }
      }
    }
  };

  maskSensitiveData(clonedContent);
  return clonedContent;
}

async function* generateClaudeMessages(
  repoPath: string,
  enhancedPrompt: string,
) {
  let sessionId: string | undefined;

  try {
    for await (const message of query({
      prompt: enhancedPrompt,
      abortController: new AbortController(),
      options: {
        cwd: repoPath,
        model: LLMMappings.CLAUDESONNET,
        permissionMode: 'bypassPermissions',
        pathToClaudeCodeExecutable: '/usr/local/bin/claude',
      },
    })) {
      if (message.type === 'system' && message.subtype === 'init') {
        sessionId = message.session_id;
        yield { type: 'init', sessionId };
      } else if (message.type === 'assistant') {
        if (
          message.message.content[0] &&
          message.message.content[0].type === 'text'
        ) {
          yield {
            type: 'message',
            content: maskApiKeys(message.message.content),
          };
        }
      } else if (message.type === 'result') {
        yield {
          type: 'complete',
          success: message.subtype === 'success',
          error: message.is_error,
        };
      }
    }
  } catch (error) {
    console.log(error);
    yield { type: 'error', success: false, error };
  }
}

export async function* claudeCode(payload: ClaudeCodeParams) {
  logger.info('Starting Claude code execution', {
    workspaceId: payload.workspaceId,
    userId: payload.userId,
    repoUrl: payload.repo_url,
    branchName: payload.branch_name,
  });

  const githubIntegrationToken = await getGithubIntegrationToken(
    payload.workspaceId,
  );

  if ((githubIntegrationToken as CheckErrors).error) {
    logger.error('Failed to get GitHub integration token', {
      error: githubIntegrationToken,
      workspaceId: payload.workspaceId,
    });
    throw new Error(JSON.stringify(githubIntegrationToken));
  }

  const GITHUB_API_KEY = githubIntegrationToken;

  const sessions = await checkUserSessions(payload.userId);

  if ((sessions as CheckErrors).error) {
    logger.error('Failed to check user sessions', {
      error: sessions,
      userId: payload.userId,
    });
    throw new Error(JSON.stringify(sessions));
  }

  // Create temp directory
  const tempDir = path.join(os.tmpdir(), `repo-${Date.now()}`);
  const branchName = payload.branch_name ?? 'main';
  await fs.promises.mkdir(tempDir, { recursive: true });

  logger.info('Created temporary directory', { tempDir });

  try {
    // Extract owner and repo from repo_url
    const urlParts = payload.repo_url.split('/');
    const owner = urlParts[urlParts.length - 2];
    const repo = urlParts[urlParts.length - 1];

    logger.info('Repository details', { owner, repo, branchName });

    // Get GitHub user info
    const { data: githubUser } = await axios.get(
      'https://api.github.com/user',
      {
        headers: {
          Authorization: `token ${GITHUB_API_KEY}`,
        },
      },
    );

    logger.info('Retrieved GitHub user info', {
      username: githubUser.login,
    });

    // Clone repository using token
    const remoteUrl = `https://${GITHUB_API_KEY}:x-oauth-basic@github.com/${owner}/${repo}.git`;
    logger.info('Cloning repository', { owner, repo, branchName });

    await execAsync(`git clone --branch ${branchName} ${remoteUrl}`, {
      cwd: tempDir,
    });

    const repoPath = path.join(tempDir, repo);

    // Configure git user
    logger.info('Configuring git user');
    await execAsync(
      `git config user.name "${githubUser.name || githubUser.login}"`,
      {
        cwd: repoPath,
      },
    );
    await execAsync(`git config user.email "${githubUser.email}"`, {
      cwd: repoPath,
    });

    // Construct enhanced prompt
    logger.info('Constructing enhanced prompt');
    const enhancedPrompt = `
    Please analyze and modify the code following these guidelines:

    1. Best Practices Summary (prioritized):
    - HIGH: Write clean, maintainable code with proper error handling
    - HIGH: Follow language-specific conventions and best practices
    - HIGH: Use meaningful variable/function names and add comments for complex logic
    - MEDIUM: Consider performance implications and optimize where necessary
    - MEDIUM: Follow SOLID principles and appropriate design patterns
    - MEDIUM: Keep functions small, focused, and avoid code duplication
    - LOW: Add comprehensive documentation where beneficial

    2. Repository Context:
    - Repository: ${payload.repo_url}
    - Branch: ${branchName}

    3. Code Quality:
    - Ensure proper error handling and logging
    - Add input validation where needed
    - Follow async/await best practices
    - Use TypeScript types/interfaces appropriately
    - Add JSDoc comments for public APIs
    - Consider backwards compatibility
    - Follow semantic versioning
    - Add unit tests for new functionality

    4. User Query:
    ${payload.query}

    Important Instructions:
    1. Make Changes:
       - Focus on changes directly addressing the user query
       - Prefer minimal, targeted changes unless comprehensive refactoring is requested
       - If multiple approaches are possible, choose the most maintainable one
    
    2. After Making Changes:
       a. Stage and commit with a descriptive message
       b. CRITICAL: Always push your changes to the branch after committing
       c. Verify the push was successful before proceeding
       d. Explain what was changed and why, including:
          - Specific files modified
          - Nature of changes
          - Reasoning behind changes
          - Any potential impacts or considerations

    3. If You Encounter Problems:
       - If you face errors, try to resolve them if possible
       - Document any errors you couldn't resolve
       - Explain the nature of the problem and potential solutions

    4. If you need additional input:
      - Always push current changes
      - Clearly state what information is needed
      - Explain why it's needed
      - Suggest possible options

    
    Security Notice:
    - You do NOT have access to any environment variables except for a minimal set required for git operations (e.g., PATH, LANG).
    - Do NOT attempt to access secrets, tokens, or environment variables such as DATABASE_URL, API keys, etc.
    - If you need credentials for git operations, they are already provided via the remote URL.
      `;

    logger.info('Starting Claude message stream');
    const messageStream = generateClaudeMessages(repoPath, enhancedPrompt);

    for await (const step of messageStream) {
      logger.debug('Claude message received', { stepType: step.type });
      yield step;
    }
  } catch (error) {
    logger.error('Error in Claude code execution', {
      error: error.message,
      stack: error.stack,
    });
    yield { error };
  } finally {
    // Clean up temp directory
    try {
      logger.info('Cleaning up temporary directory', { tempDir });
      await fs.promises.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      logger.warn('Failed to clean up temporary directory', {
        error: error.message,
        tempDir,
      });
    }
  }
}
