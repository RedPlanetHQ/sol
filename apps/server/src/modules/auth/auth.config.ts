import { PrismaClient } from '@prisma/client';
import { betterAuth, type User, type Session } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { apiKey, genericOAuth, bearer } from 'better-auth/plugins';

import { pluginAuth } from './plugin';

interface CoreUserInfo {
  sub?: string;
  id?: string;
  email: string;
  name?: string;
  fullname?: string;
  picture?: string;
  image?: string;
  email_verified?: boolean;
}
const prisma = new PrismaClient();

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),

  // Configure custom table names
  user: {
    modelName: 'User',
  },

  // Basic app configuration
  baseURL: 'http://localhost:53082',
  basePath: '/auth',

  // Session configuration
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    modelName: 'AuthSession',
  },
  // Account and verification table configuration
  account: {
    modelName: 'AuthAccount',
  },
  verification: {
    modelName: 'AuthVerification',
  },
  // Trust proxy for production
  trustedOrigins: [
    process.env.FRONTEND_HOST || 'http://localhost:3000',
    'https://app.heysol.ai',
  ],

  logger: {
    disabled: false,
    level: 'debug',
    log: (level, message, ...args) => {
      // Custom logging implementation
      console.log(`[${level}] ${message}`, ...args);
    },
  },

  // Configure Core OAuth2 provider
  plugins: [
    genericOAuth({
      config: [
        {
          providerId: 'redplanethq_core',
          clientId: process.env.CORE_CLIENT_ID!,
          clientSecret: process.env.CORE_CLIENT_SECRET!,

          // // CORE OAuth2 endpoints
          authorizationUrl: `${process.env.CORE_BASE_URL}/oauth/authorize`,
          tokenUrl: `${process.env.CORE_BASE_URL}/oauth/token`,
          userInfoUrl: `${process.env.CORE_BASE_URL}/oauth/userinfo`,
          redirectURI: `${process.env.FRONTEND_HOST}/api/auth/oauth2/callback/redplanethq_core`,

          // // OAuth2 scopes
          scopes: ['read', 'write'],

          // // Additional configuration
          pkce: true, // Use PKCE for security

          // Custom user info transformation if needed
          async getUserInfo(tokens) {
            const response = await fetch(
              `${process.env.CORE_BASE_URL}/oauth/userinfo`,
              {
                headers: {
                  Authorization: `Bearer ${tokens.accessToken}`,
                },
              },
            );

            if (!response.ok) {
              throw new Error('Failed to fetch user info');
            }

            const userInfo: CoreUserInfo = await response.json();

            // Map Core user info to Better Auth format
            return {
              id: userInfo.sub || userInfo.id || '',
              email: userInfo.email,
              name:
                userInfo.name ||
                userInfo.fullname ||
                userInfo.email.split('@')[0],
              image: userInfo.picture || userInfo.image,
              emailVerified: Boolean(userInfo.email_verified),
              createdAt: new Date(),
              updatedAt: new Date(),
            };
          },
        },
      ],
    }),

    bearer(),
    apiKey({
      defaultPrefix: 'sol_pat_',
      keyExpiration: {
        defaultExpiresIn: 30 * 24 * 60 * 60 * 1000,
      },
    }),
    pluginAuth(),
  ],

  async onUserCreated(user: User) {
    console.log('New user created:', user.id, user.email);

    try {
      // Update user with fullname and any missing fields
      await prisma.user.update({
        where: { id: user.id },
        data: {
          fullname: user.name || user.email.split('@')[0],
          username: user.email.split('@')[0],
        },
      });

      console.log('User profile updated:', user.id);
    } catch (error) {
      console.error('Error updating user profile:', user.id, error);
    }
  },

  // Optional: Custom session creation hook
  async onSessionCreated(_session: Session, user: User) {
    console.log('New session created for user:', user.id);
    // Add any custom logic here, like adding workspace context
  },
});

export type AuthSession = typeof auth.$Infer.Session.session;
export type AuthUser = typeof auth.$Infer.Session.user;
