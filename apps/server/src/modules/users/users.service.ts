import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { CodeDto, User } from '@redplanethq/sol-sdk';
import { PrismaService } from 'nestjs-prisma';

import { auth } from 'modules/auth/auth.config';
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

  async createApiKey(name: string, userId: string) {
    const apiKey = await auth.api.createApiKey({
      body: {
        userId,
        name,
      },
    });

    return { name, token: apiKey.key, id: apiKey.id };
  }

  async getApiKeys(userId: string) {
    const apiKeys = await this.prisma.apikey.findMany({
      where: { userId, enabled: true },
      select: { id: true, name: true, createdAt: true },
    });

    return apiKeys;
  }

  async deleteApiKey(apiKeyId: string) {
    await this.prisma.apikey.update({
      where: { id: apiKeyId },
      data: {
        enabled: false,
      },
    });
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

  async getOrCreateApiKey(userId: string) {
    // First try to find an existing active API key
    const existingApiKey = await this.prisma.apikey.findFirst({
      where: {
        userId,
        enabled: true,
        name: 'default',
      },
    });

    if (existingApiKey) {
      // Check if it's not expired
      if (!existingApiKey.expiresAt || existingApiKey.expiresAt > new Date()) {
        return existingApiKey.key;
      }
    }

    // If no active API key exists or expired, create a new one
    const apiKey = await this.createApiKey('default', userId);
    return apiKey.token;
  }

  async authorizeCode(userId: string, workspaceId: string, codeBody: CodeDto) {
    // only allow authorization codes that were created less than 10 mins ago
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    if (!codeBody.code) {
      throw new BadRequestException('No code');
    }

    const code = await this.prisma.authorizationCode.findFirst({
      where: {
        code: codeBody.code,
        apiKeyId: null,
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

    const token = await this.createApiKey(
      `login_${Math.random().toString(36).substring(2, 15)}`,
      userId,
    );

    await this.prisma.authorizationCode.update({
      where: {
        id: code.id,
      },
      data: {
        apiKeyId: `${token.token}__${token.id}`,
        workspaceId,
      },
    });

    return token;
  }

  /** Gets an API Key from an Auth Code, this only works within 10 mins of the auth code being created */
  async getApiKeyFromAuthorizationCode(authorizationCode: string) {
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

    if (!code.apiKeyId) {
      throw new Error('No API key found');
    }

    const token = code.apiKeyId.split('__')[0];

    await this.prisma.authorizationCode.update({
      where: {
        id: code.id,
      },
      data: {
        apiKeyId: code.apiKeyId.split('__')[1],
      },
    });

    return {
      token,
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
