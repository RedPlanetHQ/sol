import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { CodeDto, User } from '@redplanethq/sol-sdk';
import { PrismaService } from 'nestjs-prisma';

import { generatePersonalAccessToken } from 'common/authentication';

import { LoggerService } from 'modules/logger/logger.service';

import { UpdateUserBody, userSerializer } from './users.interface';
import { generateUniqueId } from './users.utils';

@Injectable()
export class UsersService {
  private readonly logger = new LoggerService(UsersService.name);

  constructor(private prisma: PrismaService) {}

  async upsertUser(
    id: string,
    email: string,
    fullname: string,
    username?: string,
  ) {
    try {
      return await this.prisma.user.upsert({
        where: { email },
        create: {
          id,
          email,
          fullname,
          username: username ?? email.split('@')[0],
          UserUsage: {
            create: {
              availableCredits: 50,
            },
          },
        },
        update: {},
      });
    } catch (error) {
      this.logger.error({
        message: `Error while upserting the user with id: ${id}`,
        where: `UsersService.upsertUser`,
        error,
      });
      throw new InternalServerErrorException(
        error,
        `Error while upserting the user with id: ${id}`,
      );
    }
  }

  async getUser(id: string): Promise<User> {
    this.logger.debug({
      message: `fetching user with id ${id}`,
      payload: { id },
      where: `UsersService.getUser`,
    });

    const user = await this.prisma.user.findUnique({
      where: {
        id,
      },
      include: {
        workspace: true,
      },
    });

    return userSerializer(user);
  }

  async getUserByEmail(email: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: {
        email,
      },
    });

    return userSerializer(user);
  }
  async updateUser(id: string, updateData: UpdateUserBody) {
    const { mcp, ...otherUpdateData } = updateData;
    const user = await this.prisma.user.update({
      where: {
        id,
      },
      data: { ...otherUpdateData, mcp: JSON.parse(mcp) },
    });
    return userSerializer(user);
  }

  async createPersonalAccessToken(
    name: string,
    userId: string,
    workspaceId: string,
    type = 'user',
  ) {
    const token = generatePersonalAccessToken();

    const pat = await this.prisma.personalAccessToken.create({
      data: {
        name,
        userId,
        token,
        workspaceId,
        type,
      },
    });

    return { name, token, id: pat.id };
  }

  async getPats(userId: string) {
    const pats = (
      await this.prisma.personalAccessToken.findMany({
        where: { userId, type: 'user', deleted: null },
      })
    ).map((pat) => ({ name: pat.name, id: pat.id }));

    return pats;
  }

  async deletePat(patId: string) {
    await this.prisma.personalAccessToken.update({
      where: { id: patId },
      data: {
        deleted: new Date(),
      },
    });
  }

  async getJwtFromPat(token: string) {
    const pat = await this.prisma.personalAccessToken.findFirst({
      where: { token, deleted: null },
    });

    return pat?.jwt;
  }

  // Authorization code
  // Used in cli
  async generateAuthorizationCode() {
    return this.prisma.authorizationCode.create({
      data: {
        code: generateUniqueId(),
      },
      select: {
        code: true,
      },
    });
  }

  async getOrCreatePat(userId: string, workspaceId: string) {
    // First try to find an existing active PAT
    const existingPat = await this.prisma.personalAccessToken.findFirst({
      where: {
        userId,
        type: 'user',
        deleted: null,
        workspaceId,
      },
    });

    if (existingPat) {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const isExpired = existingPat.createdAt < thirtyDaysAgo;

      if (!isExpired) {
        return existingPat.token;
      }

      // If expired, refresh the PAT
      const token = generatePersonalAccessToken();

      const updatedPat = await this.prisma.personalAccessToken.update({
        where: { id: existingPat.id },
        data: {
          token,
          createdAt: new Date(), // Reset the creation date
        },
      });

      return updatedPat.token;
    }

    // If no active PAT exists, create a new one
    const pat = await this.createPersonalAccessToken(
      'default',
      userId,
      workspaceId,
      'user',
    );
    return pat.token;
  }

  async authorizeCode(userId: string, workspaceId: string, codeBody: CodeDto) {
    // only allow authorization codes that were created less than 10 mins ago
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const code = await this.prisma.authorizationCode.findFirst({
      where: {
        code: codeBody.code,
        personalAccessTokenId: null,
        createdAt: {
          gte: tenMinutesAgo,
        },
      },
    });

    if (!code) {
      throw new Error(
        'Invalid authorization code, code already used, or code expired',
      );
    }

    const existingCliPersonalAccessToken =
      await this.prisma.personalAccessToken.findFirst({
        where: {
          userId,
          type: 'cli',
        },
      });

    // we only allow you to have one CLI PAT at a time, so return this
    if (existingCliPersonalAccessToken) {
      // associate this authorization code with the existing personal access token
      await this.prisma.authorizationCode.updateMany({
        where: {
          code: codeBody.code,
        },
        data: {
          personalAccessTokenId: existingCliPersonalAccessToken.id,
          workspaceId,
        },
      });

      if (existingCliPersonalAccessToken.deleted) {
        // re-activate revoked CLI PAT so we can use it again
        await this.prisma.personalAccessToken.update({
          where: {
            id: existingCliPersonalAccessToken.id,
          },
          data: {
            deleted: null,
          },
        });
      }

      // we don't return the decrypted token
      return {
        id: existingCliPersonalAccessToken.id,
        name: existingCliPersonalAccessToken.name,
        userId: existingCliPersonalAccessToken.userId,
      };
    }

    const token = await this.createPersonalAccessToken('cli', userId, 'cli');

    await this.prisma.authorizationCode.updateMany({
      where: {
        code: codeBody.code,
      },
      data: {
        personalAccessTokenId: token.id,
        workspaceId,
      },
    });

    return token;
  }

  /** Gets a PersonalAccessToken from an Auth Code, this only works within 10 mins of the auth code being created */
  async getPersonalAccessTokenFromAuthorizationCode(authorizationCode: string) {
    // only allow authorization codes that were created less than 10 mins ago
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const code = await this.prisma.authorizationCode.findFirst({
      where: {
        code: authorizationCode,
        createdAt: {
          gte: tenMinutesAgo,
        },
      },
    });
    if (!code) {
      throw new Error('Invalid authorization code, or code expired');
    }

    if (!code.personalAccessTokenId) {
      throw new Error('No personal token found');
    }

    const pat = await this.prisma.personalAccessToken.findUnique({
      where: { id: code.personalAccessTokenId },
    });

    // there's no PersonalAccessToken associated with this code
    if (!pat) {
      return {
        token: null,
        workspaceId: undefined,
      };
    }

    return {
      token: pat.token,
      workspaceId: code.workspaceId,
    };
  }

  async hasAvailableCredits(userId: string) {
    const userUsage = await this.prisma.userUsage.findUnique({
      where: {
        userId,
      },
    });

    if (!userUsage) {
      return false;
    }

    return userUsage.availableCredits > 0;
  }
}
