import { PrismaInstrumentation } from '@prisma/instrumentation';
import { BuildExtension, BuildContext } from '@trigger.dev/build';
import {
  additionalPackages,
  syncEnvVars,
} from '@trigger.dev/build/extensions/core';
import { prismaExtension } from '@trigger.dev/build/extensions/prisma';
import { defineConfig } from '@trigger.dev/sdk/v3';

export default defineConfig({
  project: 'proj_fiaatxwphtcuoriofpbe',
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
        BACKEND_URL: process.env.BACKEND_HOST,
      })),
      additionalPackages({
        packages: ['@tegonhq/sigma-sdk'],
      }),
      installUVX(),
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
        // Install curl and uvx
        `RUN apt-get update && apt-get install -y curl && \
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
