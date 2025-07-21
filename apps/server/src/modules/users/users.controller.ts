import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { CodeDto, User } from '@redplanethq/sol-sdk';
import { Response } from 'express';

import type { AuthUser } from 'modules/auth/auth.config';
import { AuthGuard } from 'modules/auth/auth.guard';
import { CurrentUser, UserId, Workspace } from 'modules/auth/session.decorator';

import { UpdateUserBody, UserIdParams } from './users.interface';
import { UsersService } from './users.service';

@Controller({
  version: '1',
  path: 'users',
})
export class UsersController {
  constructor(private users: UsersService) {}

  @Get()
  @UseGuards(AuthGuard)
  async getUser(@CurrentUser() currentUser: AuthUser): Promise<User> {
    const user = await this.users.getUser(currentUser.id);

    return user;
  }

  @Get('email')
  @UseGuards(AuthGuard)
  async getUserByEmail(@Query('email') email: string): Promise<User> {
    const user = await this.users.getUserByEmail(email);
    return user;
  }

  @Post('api-key')
  @UseGuards(AuthGuard)
  async createApiKey(
    @CurrentUser() currentUser: AuthUser,
    @Body() body: { name: string },
  ) {
    const apiKey = await this.users.createApiKey(body.name, currentUser.id);

    return apiKey;
  }

  @Post('api-key-for-code')
  async getApiKeyForCode(
    @Body()
    codeBody: CodeDto,
  ) {
    return await this.users.getApiKeyFromAuthorizationCode(codeBody.code);
  }

  @Get('api-key-authentication')
  @UseGuards(AuthGuard)
  async getApiKeyAuthentication(@Res() res: Response) {
    console.log('getApiKeyAuthentication');
    // With Better Auth, the user already has a valid session
    // No need to create a new session
    res.send({ status: 200 });
  }

  @Get('api-keys')
  @UseGuards(AuthGuard)
  async getApiKeys(@CurrentUser() currentUser: AuthUser) {
    return await this.users.getApiKeys(currentUser.id);
  }

  @Delete('api-keys/:apiKeyId')
  @UseGuards(AuthGuard)
  async deleteApiKey(@Param('apiKeyId') apiKeyId: string) {
    return await this.users.deleteApiKey(apiKeyId);
  }

  @Get('authorization')
  async createAuthorizationCode(): Promise<CodeDto> {
    return this.users.generateAuthorizationCode();
  }

  @Post('authorization')
  @UseGuards(AuthGuard)
  async authorizeCode(
    @UserId() userId: string,
    @Workspace() workspaceId: string,
    @Body()
    codeBody: CodeDto,
  ) {
    return this.users.authorizeCode(userId, workspaceId, codeBody);
  }

  @Post(':userId')
  async updateUser(
    @Param() userIdBody: UserIdParams,
    @Body()
    updateUserBody: UpdateUserBody,
  ): Promise<User> {
    const user = await this.users.updateUser(userIdBody.userId, updateUserBody);

    return user;
  }
}
