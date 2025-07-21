import { apiKeyClient, genericOAuthClient } from 'better-auth/client/plugins';
import { nextCookies } from 'better-auth/next-js';
import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BASE_HOST || 'http://localhost:3000',
  basePath: '/api/auth',
  // Add any plugins you're using on the server
  plugins: [nextCookies(), genericOAuthClient(), apiKeyClient()],
});

export const { signIn, signUp, signOut, useSession, getSession } = authClient;
