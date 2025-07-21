import { Injectable } from '@nestjs/common';
import {
  CreateIntegrationAccountDto,
  InputJsonValue,
  IntegrationAccountIdDto,
  IntegrationPayloadEventType,
  UpdateIntegrationAccountDto,
} from '@redplanethq/sol-sdk';
import { schedules } from '@trigger.dev/sdk/v3';
import { PrismaService } from 'nestjs-prisma';

import { IntegrationsService } from 'modules/integrations/integrations.service';

import { IntegrationAccountSelect } from './integration-account.interface';

@Injectable()
export class IntegrationAccountService {
  constructor(
    private prisma: PrismaService,
    private integrationService: IntegrationsService,
  ) {}

  async createIntegrationAccount(
    workspaceId: string,
    userId: string,
    createIntegrationAccountDto: CreateIntegrationAccountDto,
  ) {
    const {
      config: integrationConfiguration,
      settings,
      accountId,
      integrationDefinitionId,
    } = createIntegrationAccountDto;
    // Update the integration account with the new configuration in the database
    const integrationAccount = await this.prisma.integrationAccount.upsert({
      where: {
        accountId_integrationDefinitionId_workspaceId: {
          accountId,
          integrationDefinitionId,
          workspaceId,
        },
      },
      create: {
        integrationConfiguration,
        settings,
        accountId,
        integratedById: userId,
        workspaceId,
        integrationDefinitionId,
        isActive: true,
      },
      update: {
        deleted: null,
        integrationConfiguration,
        settings,
        isActive: true,
      },
    });

    return integrationAccount;
  }

  async createIntegrationAccountByApiKey(
    workspaceId: string,
    userId: string,
    createIntegrationAccountDto: Partial<CreateIntegrationAccountDto>,
  ) {
    const integrationDefinition =
      await this.prisma.integrationDefinitionV2.findUnique({
        where: { id: createIntegrationAccountDto.integrationDefinitionId },
      });

    const integrationAccount =
      await this.integrationService.runIntegrationTrigger(
        integrationDefinition,
        {
          event: IntegrationPayloadEventType.INTEGRATION_ACCOUNT_CREATED,
          userId,
          workspaceId,
          eventBody: {
            integrationDefinition,
            ...createIntegrationAccountDto,
          },
        },
        userId,
      );

    return integrationAccount;
  }

  async getIntegrationAccountWithId(integrationAccountId: string) {
    return await this.prisma.integrationAccount.findUnique({
      where: {
        id: integrationAccountId,
      },
      select: IntegrationAccountSelect,
    });
  }

  async deleteIntegrationAccount(
    integrationAccountRequestIdBody: IntegrationAccountIdDto,
  ) {
    const integrationAccount = await this.prisma.integrationAccount.update({
      where: {
        id: integrationAccountRequestIdBody.integrationAccountId,
      },
      data: {
        deleted: new Date().toISOString(),
        isActive: false,
      },
      include: {
        integrationDefinition: true,
        workspace: true,
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const scheduleId = (integrationAccount.settings as any).scheduleId;
    await schedules.del(scheduleId);

    return integrationAccount;
  }

  async getIntegrationAccount(
    integrationAccountId: string,
    workspaceId: string,
  ) {
    const integrationAccount = await this.prisma.integrationAccount.findUnique({
      where: {
        workspaceId,
        id: integrationAccountId,
      },
      select: IntegrationAccountSelect,
    });

    return integrationAccount;
  }

  async getIntegrationAccountsForWorkspace(workspaceId: string) {
    return await this.prisma.integrationAccount.findMany({
      where: {
        workspace: {
          id: workspaceId,
        },
      },
      orderBy: [
        {
          updatedAt: 'asc',
        },
      ],
      select: IntegrationAccountSelect,
    });
  }

  async updateIntegrationAccount(
    integrationAccountId: string,
    updateIntegrationAccountBody: UpdateIntegrationAccountDto,
  ) {
    return await this.prisma.integrationAccount.update({
      data: {
        ...updateIntegrationAccountBody,
        settings: updateIntegrationAccountBody.settings as InputJsonValue,
      },
      where: {
        id: integrationAccountId,
      },
      select: IntegrationAccountSelect,
    });
  }

  async getIntegrationAccountByAccountId(accountId: string) {
    return await this.prisma.integrationAccount.findFirst({
      where: { accountId, deleted: null },
      select: IntegrationAccountSelect,
    });
  }

  async getIntegrationAccounts(workspaceId: string) {
    return await this.prisma.integrationAccount.findMany({
      where: {
        workspaceId,
        deleted: null,
      },
    });
  }
}
