import { PrismaInstrumentation } from '@prisma/instrumentation';
import { BuildExtension, BuildContext } from '@trigger.dev/build';
import {
  additionalPackages,
  syncEnvVars,
} from '@trigger.dev/build/extensions/core';
import { prismaExtension } from '@trigger.dev/build/extensions/prisma';
import { defineConfig } from '@trigger.dev/sdk/v3';

export default defineConfig({
  project: 'proj_sol_common',
  runtime: 'node',
  logLevel: 'log',
  maxDuration: 3600,
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 1,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
      randomize: true,
    },
  },
  dirs: ['./src/triggers'],
  instrumentations: [new PrismaInstrumentation()],
  build: {
    extensions: [
      syncEnvVars(() => ({
        DATABASE_URL: process.env.DATABASE_URL,
        BACKEND_HOST: process.env.BACKEND_HOST,
      })),
      additionalPackages({
        packages: ['@redplanethq/sol-sdk'],
      }),
      installUVX(),
      installClaude(),
      prismaExtension({
        schema: 'prisma/schema.prisma',
      }),
    ],
  },
});

// This is a custom build extension to install Playwright and Chromium
export function installUVX(): BuildExtension {
  return {
    name: 'InstallUVX',
    onBuildComplete(context: BuildContext) {
      const instructions = [
        // Install curl, git and uvx
        `RUN apt-get update && apt-get install -y curl git && \
    curl -LsSf https://astral.sh/uv/install.sh | sh && \
    cp ~/.local/bin/uvx /usr/local/bin/ && \
    cp ~/.local/bin/uv /usr/local/bin/`,
      ];

      context.addLayer({
        id: 'uvx',
        image: { instructions },
        deploy: {
          env: {},
          override: true,
        },
      });
    },
  };
}

export function installClaude(): BuildExtension {
  return {
    name: 'InstallClaude',
    onBuildComplete(context: BuildContext) {
      const instructions = [
        // Install Claude CLI globally and make it available in PATH
        `RUN npm install -g @anthropic-ai/claude-code`,
      ];

      context.addLayer({
        id: 'claude',
        image: { instructions },
        deploy: {
          env: {},
          override: true,
        },
      });
    },
  };
}
