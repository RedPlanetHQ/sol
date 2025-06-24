import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  Conversation,
  ConversationParamsDto,
  CreateConversationDto,
} from '@redplanethq/sol-sdk';

import { AuthGuard } from 'modules/auth/auth.guard';
import { CreditsGuard } from 'modules/auth/credit.guard';
import { UserId, Workspace } from 'modules/auth/session.decorator';

import { ConversationService } from './conversation.service';

@Controller({
  version: '1',
  path: 'conversation',
})
export class ConversationController {
  constructor(private conversationService: ConversationService) {}

  @Post('approval')
  @UseGuards(AuthGuard)
  async approveOrDecline(
    @Workspace() workspaceId: string,
    @Body() conversationData: { conversationId: string; approved: boolean },
  ) {
    return await this.conversationService.approveOrDecline(
      conversationData.conversationId,
      workspaceId,
      conversationData.approved,
    );
  }

  @Post(':conversationId/read')
  @UseGuards(AuthGuard)
  async readConversation(@Param() conversationParams: ConversationParamsDto) {
    return await this.conversationService.readConversation(
      conversationParams.conversationId,
    );
  }

  @Post(':conversationId/stop')
  @UseGuards(AuthGuard)
  async stopConversation(
    @Param() conversationParams: ConversationParamsDto,
    @Workspace() workspaceId: string,
  ) {
    return await this.conversationService.stopConversation(
      conversationParams.conversationId,
      workspaceId,
    );
  }

  @Post()
  @UseGuards(AuthGuard, CreditsGuard)
  async createConversation(
    @Workspace() workspaceId: string,
    @UserId() userId: string,
    @Body() conversationData: CreateConversationDto,
  ) {
    return await this.conversationService.createConversation(
      workspaceId,
      userId,
      conversationData,
    );
  }

  @Get(':conversationId/run')
  @UseGuards(AuthGuard, CreditsGuard)
  async getConversationStream(
    @Workspace() workspaceId: string,
    @Param() conversationData: { conversationId: string },
  ) {
    return await this.conversationService.getCurrentConversationRun(
      conversationData.conversationId,
      workspaceId,
    );
  }

  @Get(':conversationId')
  @UseGuards(AuthGuard, CreditsGuard)
  async getConversation(
    @Param() conversationParams: ConversationParamsDto,
  ): Promise<Conversation> {
    return await this.conversationService.getConversation(
      conversationParams.conversationId,
    );
  }

  @Delete(':conversationId')
  @UseGuards(AuthGuard)
  async deleteConversation(
    @Param() conversationParams: ConversationParamsDto,
  ): Promise<Conversation> {
    return await this.conversationService.deleteConversation(
      conversationParams.conversationId,
    );
  }
}
