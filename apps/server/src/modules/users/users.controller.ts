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
import { CodeDto, CreatePatDto, PatIdDto, User } from '@redplanethq/sol-sdk';
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

  @Post('pat')
  @UseGuards(AuthGuard)
  async createPersonalAccessToken(
    @Workspace() workspaceId: string,
    @CurrentUser() currentUser: AuthUser,
    @Body()
    createPatDto: CreatePatDto,
  ) {
    const user = await this.users.createPersonalAccessToken(
      createPatDto.name,
      currentUser.id,
      workspaceId,
    );

    return user;
  }

  @Post('pat-for-code')
  async getPatForCode(
    @Body()
    codeBody: CodeDto,
  ) {
    return await this.users.getPersonalAccessTokenFromAuthorizationCode(
      codeBody.code,
    );
  }

  @Get('pat-authentication')
  @UseGuards(AuthGuard)
  async getPatAuthentication(@Res() res: Response) {
    // With Better Auth, the user already has a valid session
    // No need to create a new session
    res.send({ status: 200 });
  }

  @Get('pats')
  @UseGuards(AuthGuard)
  async getPats(@CurrentUser() currentUser: AuthUser) {
    return await this.users.getPats(currentUser.id);
  }

  @Delete('pats/:patId')
  @UseGuards(AuthGuard)
  async deletePat(@Param() patIdDto: PatIdDto) {
    return await this.users.deletePat(patIdDto.patId);
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
