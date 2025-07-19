import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BASE_HOST || 'http://localhost:3000',
  // Add any plugins you're using on the server
});

export const { signIn, signUp, signOut, useSession, getSession } = authClient;
