import type { integrationRun } from 'triggers/integrations/integration-run';

import { Injectable } from '@nestjs/common';
import { IntegrationDefinition } from '@redplanethq/sol-sdk';
import { tasks } from '@trigger.dev/sdk/v3';

import { LoggerService } from 'modules/logger/logger.service';
import { UsersService } from 'modules/users/users.service';

@Injectable()
export class IntegrationsService {
  private readonly logger = new LoggerService(IntegrationsService.name);

  constructor(private usersService: UsersService) {}

  private async prepareIntegrationTrigger(
    integrationDefinition: IntegrationDefinition,
    userId?: string,
  ) {
    this.logger.info({
      message: `Loading integration ${integrationDefinition.slug}`,
      where: 'IntegrationsService.runIntegrationTrigger',
    });

    const apiKey = userId
      ? await this.usersService.getOrCreateApiKey(userId)
      : '';

    return {
      integrationDefinition,
      apiKey,
    };
  }

  async runIntegrationTriggerAsync(
    integrationDefinition: IntegrationDefinition,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    event: any,
    userId?: string,
  ) {
    const params = await this.prepareIntegrationTrigger(
      integrationDefinition,
      userId,
    );
    return await tasks.trigger<typeof integrationRun>('integration-run', {
      ...params,
      event,
    });
  }

  async runIntegrationTrigger(
    integrationDefinition: IntegrationDefinition,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    event: any,
    userId?: string,
  ) {
    const params = await this.prepareIntegrationTrigger(
      integrationDefinition,
      userId,
    );

    const response = await tasks.triggerAndPoll<typeof integrationRun>(
      'integration-run',
      {
        ...params,
        integrationAccount: event.integrationAccount,
        event: event.event,
        eventBody: event.eventBody,
      },
    );

    if (response.status === 'COMPLETED') {
      return response.output;
    }

    throw new Error(
      `Integration trigger failed with status: ${response.status}`,
    );
  }
}
