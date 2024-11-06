import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  IntegrationAccount,
  IntegrationAccountIdDto,
  UpdateIntegrationAccountDto,
} from '@sigma/types';
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { GetIntegrationAccountByNames } from '@sigma/types';

import { AuthGuard } from 'modules/auth/auth.guard';
import { Workspace } from 'modules/auth/session.decorator';

import { IntegrationAccountService } from './integration-account.service';

@Controller({
  version: '1',
  path: 'integration_account',
})
export class IntegrationAccountController {
  constructor(private integrationAccountService: IntegrationAccountService) {}

  /**
   * Get all integration accounts in a workspace
   */
  @Get()
  @UseGuards(AuthGuard)
  async getIntegrationAccounts(
    @Workspace() workspaceId: string,
  ): Promise<IntegrationAccount[]> {
    return await this.integrationAccountService.getIntegrationAccountsForWorkspace(
      workspaceId,
    );
  }

  @Get('account_id')
  @UseGuards(AuthGuard)
  async getIntegrationAccountByAccountId(
    @Query('accountId') accountId: string,
  ): Promise<IntegrationAccount> {
    return await this.integrationAccountService.getIntegrationAccountByAccountId(
      accountId,
    );
  }

  /**
   * Get a integration accounts in a workspace
   */
  @Get(':integrationAccountId')
  @UseGuards(AuthGuard)
  async getIntegrationAccount(
    @Param()
    integrationAccountIdRequestIdBody: IntegrationAccountIdDto,
  ): Promise<IntegrationAccount> {
    return await this.integrationAccountService.getIntegrationAccountWithId(
      integrationAccountIdRequestIdBody.integrationAccountId,
    );
  }

  /**
   * Delete a Integration account
   */
  @Delete(':integrationAccountId')
  @UseGuards(AuthGuard)
  async deleteIntegrationAccount(
    @Param()
    integrationAccountIdRequestIdBody: IntegrationAccountIdDto,
  ) {
    return await this.integrationAccountService.deleteIntegrationAccount(
      integrationAccountIdRequestIdBody,
    );
  }

  /**
   * Update a integration account in workspace
   */
  @Post(':integrationAccountId')
  @UseGuards(AuthGuard)
  async updateIntegrationAccount(
    @Param()
    integrationAccountIdRequestIdBody: IntegrationAccountIdDto,
    @Body()
    updateIntegrationAccountBody: UpdateIntegrationAccountDto,
  ): Promise<IntegrationAccount> {
    return await this.integrationAccountService.updateIntegrationAccount(
      integrationAccountIdRequestIdBody.integrationAccountId,
      updateIntegrationAccountBody,
    );
  }
  @Get('/names')
  @UseGuards(AuthGuard)
  async getIntegrationAccountsByName(
    @Query() integrationData: GetIntegrationAccountByNames,
  ) {
    return await this.integrationAccountService.getIntegrationAccountsByName(
      integrationData,
    );
  }

  @Get()
  @UseGuards(AuthGuard)
  async getIntegrationAccounts(@Workspace() workspaceId: string) {
    return await this.integrationAccountService.getIntegrationAccounts(
      workspaceId,
    );
  }
}
