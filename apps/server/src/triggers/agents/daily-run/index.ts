import { PrismaClient } from '@prisma/client';
import { Preferences } from '@redplanethq/sol-sdk';
import { schedules } from '@trigger.dev/sdk/v3';
import axios from 'axios';

import { processTaskOccurrences } from './task-occurrence';

const prisma = new PrismaClient();

export const dailyRunSchedule = schedules.task({
  id: 'daily-run-schedule',
  run: async (payload) => {
    const { externalId } = payload;

    const workspace = await prisma.workspace.findUnique({
      where: { id: externalId },
    });

    const timezone = (workspace.preferences as Preferences).timezone;

    const apiKey = await prisma.apikey.findFirst({
      where: {
        userId: workspace.userId as string,
        name: 'default',
        enabled: true,
      },
    });

    axios.interceptors.request.use((config) => {
      // Check if URL starts with /api and doesn't have a full host

      if (config.url?.startsWith('/api')) {
        config.url = `${process.env.BACKEND_HOST}${config.url.replace('/api', '')}`;
        config.headers.Authorization = `Bearer ${apiKey?.key}`;
      }

      return config;
    });

    return await processTaskOccurrences(externalId, timezone);
  },
});
