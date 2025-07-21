import { Injectable } from '@nestjs/common';
import {
  EventBody,
  EventHeaders,
  IntegrationPayloadEventType,
} from '@redplanethq/sol-sdk';
import { Response } from 'express';
import { PrismaService } from 'nestjs-prisma';

import { IntegrationsService } from 'modules/integrations/integrations.service';
import { LoggerService } from 'modules/logger/logger.service';

@Injectable()
export default class WebhookService {
  private readonly logger: LoggerService = new LoggerService('WebhookService'); // Logger instance for logging

  constructor(
    private prisma: PrismaService,
    private integrationService: IntegrationsService,
  ) {}

  async handleEvents(
    response: Response,
    sourceName: string,
    integrationAccountId: string | undefined,
    eventHeaders: EventHeaders,
    eventBody: EventBody,
  ) {
    this.logger.log({
      message: `Received webhook ${sourceName}`,
      where: `WebhookService.handleEvents`,
    });

    // Check if the event is a URL verification challenge
    if (eventBody.type === 'url_verification') {
      this.logger.log({
        message: 'Responding to Slack URL verification challenge',
      });
      response.status(200).send({ challenge: eventBody.challenge });
    }

    response.status(200).send({ status: 'acknowleged' });

    let integrationAccount;
    if (!integrationAccountId) {
      const integrationDefinition =
        await this.prisma.integrationDefinitionV2.findFirst({
          where: { slug: sourceName, deleted: null },
        });

      const accountIdResponse =
        (await this.integrationService.runIntegrationTrigger(
          integrationDefinition,
          {
            event: IntegrationPayloadEventType.IDENTIFY_WEBHOOK_ACCOUNT,
            eventBody,
          },
          // Fix this to right type
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        )) as any;

      let accountId;

      if (accountIdResponse?.message?.startsWith('The event payload type is')) {
        accountId = undefined;
      } else {
        accountId = accountIdResponse;
      }

      integrationAccount = await this.prisma.integrationAccount.findFirst({
        where: { accountId },
        include: { integrationDefinition: true },
      });
    } else {
      integrationAccount = await this.prisma.integrationAccount.findUnique({
        where: { id: integrationAccountId },
        include: { integrationDefinition: true },
      });
    }

    if (integrationAccount) {
      await this.integrationService.runIntegrationTrigger(
        integrationAccount.integrationDefinition,
        {
          event: IntegrationPayloadEventType.INTEGRATION_DATA_RECEIVED,
          integrationAccount,
          eventBody: {
            eventHeaders,
            eventData: { ...eventBody },
          },
        },
        integrationAccount.integratedById,
      );
    } else {
      this.logger.log({
        message: `Could not find integration account for webhook ${sourceName}`,
        where: 'WebhookService.handleEvents',
      });
    }
  }
}
