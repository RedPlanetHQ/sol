import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';

import { AuthGuard } from 'modules/auth/auth.guard';
import { UserId, Workspace } from 'modules/auth/session.decorator';

import { OAuthBodyInterface, CallbackParams } from './oauth-callback.interface';
import { OAuthCallbackService } from './oauth-callback.service';

@Controller({
  version: '1',
  path: 'oauth',
})
export class OAuthCallbackController {
  constructor(private oAuthCallbackService: OAuthCallbackService) {}

  @Post()
  @UseGuards(AuthGuard)
  async getRedirectURL(
    @UserId() userId: string,
    @Workspace() workspaceId: string,
    @Body() body: OAuthBodyInterface,
  ) {
    return await this.oAuthCallbackService.getRedirectURL(
      body,
      userId,
      workspaceId,
    );
  }

  @Get('callback')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async callback(@Query() queryParams: CallbackParams, @Res() res: any) {
    return await this.oAuthCallbackService.callbackHandler(queryParams, res);
  }
}
