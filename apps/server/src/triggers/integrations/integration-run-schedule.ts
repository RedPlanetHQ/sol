import { PrismaClient } from '@prisma/client';
import { IntegrationPayloadEventType } from '@redplanethq/sol-sdk';
import { logger, schedules, tasks } from '@trigger.dev/sdk/v3';

import { integrationRun } from './integration-run';

const prisma = new PrismaClient();

export const integrationRunSchedule = schedules.task({
  id: 'integration-run-schedule',
  run: async (payload) => {
    const { externalId } = payload;
    const integrationAccount = await prisma.integrationAccount.findUnique({
      where: { id: externalId },
      include: {
        integrationDefinition: true,
        workspace: true,
      },
    });

    if (!integrationAccount) {
      const deletedSchedule = await schedules.del(externalId);
      logger.info('Deleting schedule as integration account is not there');
      return deletedSchedule;
    }

    const apiKey = await prisma.apikey.findFirst({
      where: {
        userId: integrationAccount.workspace.userId,
        name: 'default',
        enabled: true,
      },
    });

    return await tasks.trigger<typeof integrationRun>('integration-run', {
      event: IntegrationPayloadEventType.SCHEDULED_SYNC,
      apiKey: apiKey.key,
      integrationAccount,
      integrationDefinition: integrationAccount.integrationDefinition,
    });
  },
});
