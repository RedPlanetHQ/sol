/**
 * This code is adapted from the official Claude Code SDK implementation,
 * see: node_modules/@anthropic-ai/claude-code/sdk.mjs
 *
 * Provides an async generator `query` for interacting with Claude Code.
 */

import type { Options, SDKMessage } from '@anthropic-ai/claude-code';

import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

interface QueryProps {
  prompt: string;
  abortController?: AbortController;
  options?: Options;
}

async function* query({
  prompt,
  abortController,
  options = {},
}: QueryProps): AsyncGenerator<SDKMessage> {
  const {
    allowedTools = [],
    appendSystemPrompt,
    customSystemPrompt,
    cwd,
    disallowedTools = [],
    executable = isRunningWithBun() ? 'bun' : 'node',
    executableArgs = [],
    maxTurns,
    mcpServers,
    pathToClaudeCodeExecutable = path.join(__dirname, 'cli.js'),
    permissionMode = 'default',
    permissionPromptToolName,
    continue: continueConversation,
    resume,
    model,
    fallbackModel,
  } = options;

  const abortCtrl = abortController ?? new AbortController();

  if (!process.env.CLAUDE_CODE_ENTRYPOINT) {
    process.env.CLAUDE_CODE_ENTRYPOINT = 'sdk-ts';
  }
  const args: string[] = ['--output-format', 'stream-json', '--verbose'];
  if (customSystemPrompt) {
    args.push('--system-prompt', customSystemPrompt);
  }
  if (appendSystemPrompt) {
    args.push('--append-system-prompt', appendSystemPrompt);
  }
  if (maxTurns) {
    args.push('--max-turns', maxTurns.toString());
  }
  if (model) {
    args.push('--model', model);
  }
  if (permissionPromptToolName) {
    args.push('--permission-prompt-tool', permissionPromptToolName);
  }
  if (continueConversation) {
    args.push('--continue');
  }
  if (resume) {
    args.push('--resume', resume);
  }
  if (allowedTools.length > 0) {
    args.push('--allowedTools', allowedTools.join(','));
  }
  if (disallowedTools.length > 0) {
    args.push('--disallowedTools', disallowedTools.join(','));
  }
  if (mcpServers && Object.keys(mcpServers).length > 0) {
    args.push('--mcp-config', JSON.stringify({ mcpServers }));
  }
  if (permissionMode !== 'default') {
    args.push('--permission-mode', permissionMode);
  }
  if (fallbackModel) {
    if (model && fallbackModel === model) {
      throw new Error(
        'Fallback model cannot be the same as the main model. Please specify a different model for fallbackModel option.',
      );
    }
    args.push('--fallback-model', fallbackModel);
  }
  if (!prompt || !prompt.trim()) {
    throw new RangeError('Prompt is required');
  }
  args.push('--print', prompt.trim());
  if (!fs.existsSync(pathToClaudeCodeExecutable)) {
    throw new ReferenceError(
      `Claude Code executable not found at ${pathToClaudeCodeExecutable}. Is options.pathToClaudeCodeExecutable set?`,
    );
  }
  logDebug(
    `Spawning Claude Code process: ${executable} ${[...executableArgs, pathToClaudeCodeExecutable, ...args].join(' ')}`,
  );
  const child = spawn(
    executable,
    [...executableArgs, pathToClaudeCodeExecutable, ...args],
    {
      cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
      signal: abortCtrl.signal,
      env: {
        ...process.env,
        DATABASE_URL: '',
        OPENAI_API_KEY: '',
        MODEL: '',
      },
    },
  );
  child.stdin.end();
  if (process.env.DEBUG) {
    child.stderr.on('data', (data: Buffer) => {
      console.error('Claude Code stderr:', data.toString());
    });
  }
  const cleanup = () => {
    if (!child.killed) {
      child.kill('SIGTERM');
    }
  };
  abortCtrl.signal.addEventListener('abort', cleanup);
  process.on('exit', cleanup);
  try {
    let processError: Error | null = null;
    child.on('error', (error: Error) => {
      processError = new Error(
        `Failed to spawn Claude Code process: ${error.message}`,
      );
    });
    const processExitPromise: Promise<void> = new Promise((resolve, reject) => {
      child.on('close', (code: number | null) => {
        if (abortCtrl.signal.aborted) {
          reject(new AbortError('Claude Code process aborted by user'));
        }
        if (code !== 0) {
          reject(new Error(`Claude Code process exited with code ${code}`));
        } else {
          resolve();
        }
      });
    });
    const rl = readline.createInterface({ input: child.stdout });
    try {
      for await (const line of rl) {
        if (processError) {
          throw processError;
        }
        if (line.trim()) {
          yield JSON.parse(line) as SDKMessage;
        }
      }
    } finally {
      rl.close();
    }
    await processExitPromise;
  } finally {
    cleanup();
    abortCtrl.signal.removeEventListener('abort', cleanup);
    if (process.env.CLAUDE_SDK_MCP_SERVERS) {
      delete process.env.CLAUDE_SDK_MCP_SERVERS;
    }
  }
}

function logDebug(message: string) {
  if (process.env.DEBUG) {
    console.debug(message);
  }
}

function isRunningWithBun(): boolean {
  return (
    typeof process.versions.bun !== 'undefined' ||
    typeof process.env.BUN_INSTALL !== 'undefined'
  );
}

class AbortError extends Error {}

export { query, AbortError };
