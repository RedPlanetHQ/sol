import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { tasks } from '@trigger.dev/sdk/v3';

import { AuthGuard } from 'modules/auth/auth.guard';
import { Workspace } from 'modules/auth/session.decorator';

import AutomationService from './automation.service';

@Controller({
  version: '1',
  path: 'automations',
})
export class AutomationController {
  constructor(private automation: AutomationService) {}

  @Post()
  @UseGuards(AuthGuard)
  async createAutomation(
    @Workspace() workspaceId: string,
    @Body() createActivityDto: { text: string; mcps: string[]; title?: string },
  ) {
    return await this.automation.createAutomation(
      createActivityDto.text,
      createActivityDto.mcps,
      workspaceId,
      createActivityDto.title,
    );
  }

  @Post('enhance-preview')
  @UseGuards(AuthGuard)
  async enhancePreview(
    @Workspace() workspaceId: string,
    @Body() body: { userInput: string },
  ) {
    // Trigger enhancement and return job ID for polling
    const job = await tasks.trigger('automation-enhancer', {
      automationId: 'preview', // Special ID for preview
      userInput: body.userInput,
      workspaceId,
    });

    return { jobId: job.id, message: 'Enhancement started' };
  }

  @Post(':automationId/enhance')
  @UseGuards(AuthGuard)
  async enhanceAutomation(
    @Param('automationId') automationId: string,
    @Workspace() workspaceId: string,
    @Body() body: { userInput: string },
  ) {
    // Verify automation exists and belongs to workspace
    await this.automation.getAutomation(automationId, workspaceId);

    // Trigger enhancement
    const job = await tasks.trigger('automation-enhancer', {
      automationId,
      userInput: body.userInput,
      workspaceId,
    });

    return { jobId: job.id, message: 'Enhancement started' };
  }

  @Get(':automationId')
  @UseGuards(AuthGuard)
  async getAutomation(
    @Param('automationId') automationId: string,
    @Workspace() workspaceId: string,
  ) {
    return await this.automation.getAutomation(automationId, workspaceId);
  }

  @Post(':automationId')
  @UseGuards(AuthGuard)
  async updateAutomation(
    @Workspace() workspaceId: string,
    @Param('automationId') automationId: string,
    @Body() updateAutomation: { text: string; mcps: string[] },
  ) {
    return await this.automation.updateAutomation(
      automationId,
      updateAutomation.text,
      updateAutomation.mcps,
      workspaceId,
    );
  }

  @Delete(':automationId')
  @UseGuards(AuthGuard)
  async deleteAutomation(
    @Workspace() workspaceId: string,

    @Param() deleteAutomationParams: { automationId: string },
  ) {
    return await this.automation.deleteAutomation(
      deleteAutomationParams.automationId,
      workspaceId,
    );
  }
}
