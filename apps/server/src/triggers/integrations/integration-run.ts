import createLoadRemoteModule, {
  createRequires,
} from '@paciolan/remote-module-loader';
import {
  IntegrationAccount,
  IntegrationDefinition,
} from '@redplanethq/sol-sdk';
import { logger, task } from '@trigger.dev/sdk/v3';
import axios from 'axios';

const fetcher = async (url: string) => {
  // Handle remote URLs with axios
  const response = await axios.get(url);

  return response.data;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const loadRemoteModule = async (requires: any) =>
  createLoadRemoteModule({ fetcher, requires });

function createAxiosInstance(apiKey: string) {
  const instance = axios.create();

  instance.interceptors.request.use((config) => {
    // Check if URL starts with /api and doesn't have a full host
    if (config.url?.startsWith('/api')) {
      config.url = `${process.env.BACKEND_HOST}${config.url.replace('/api/', '/')}`;
    }

    if (
      config.url.includes(process.env.FRONTEND_HOST) ||
      config.url.includes(process.env.BACKEND_HOST)
    ) {
      config.headers.Authorization = `Bearer ${apiKey}`;
    }

    return config;
  });

  return instance;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getRequires = (axios: any) => createRequires({ axios });

export const integrationRun = task({
  id: 'integration-run',
  run: async ({
    apiKey,
    eventBody,
    integrationAccount,
    integrationDefinition,
    event,
  }: {
    apiKey: string;
    // This is the event you want to pass to the integration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    event: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    eventBody?: any;
    integrationDefinition: IntegrationDefinition;
    integrationAccount?: IntegrationAccount;
  }) => {
    const remoteModuleLoad = await loadRemoteModule(
      getRequires(createAxiosInstance(apiKey)),
    );

    logger.info(
      `${integrationDefinition.url}/${integrationDefinition.version}/backend/index.js`,
    );

    const integrationFunction = await remoteModuleLoad(
      `${integrationDefinition.url}/${integrationDefinition.version}/backend/index.js`,
    );

    // const integrationFunction = await remoteModuleLoad(
    //   `${integrationDefinition.url}`,
    // );

    return await integrationFunction.run({
      integrationAccount,
      integrationDefinition,
      event,
      eventBody: {
        ...(eventBody ? eventBody : {}),
      },
    });
  },
});
