/* eslint-disable react/no-unescaped-entities */
import { Button } from '@redplanethq/ui';
import getConfig from 'next/config';
import { useRouter } from 'next/router';
import React from 'react';
import { z } from 'zod';

import { authClient } from 'common/lib/auth-client';
import { AuthGuard } from 'common/wrappers';

import { useIPC } from 'hooks/ipc';
import { useIsElectron } from 'hooks/use-is-electron';
import CoreLogo from 'icons/core';

import {
  useCreateAuthCodeMutation,
  type AuthCodeResponse,
} from 'services/users';

import { AuthLayout } from './layout';
import { getCookies } from './utils';

const { publicRuntimeConfig } = getConfig();

export const AuthSchema = z.object({
  email: z.string().email(),
  otp: z.string().optional(),
});

export function Auth() {
  const router = useRouter();
  const {
    query: { redirectToPath },
  } = router;

  const [loading, setLoading] = React.useState(false);

  const { mutate: createAuthCode, isLoading } = useCreateAuthCodeMutation({
    onSuccess: async (data: AuthCodeResponse) => {
      setLoading(true);
      ipc.openUrl(
        `${publicRuntimeConfig.NEXT_PUBLIC_NODE_ENV === 'production' ? 'https://app.heysol.ai' : publicRuntimeConfig.NEXT_PUBLIC_BASE_HOST}/authorize?code=${data.code}`,
      );

      try {
        await getCookies(data.code);
        router.replace('/home');
      } catch (e) {}

      setLoading(false);
    },
  });

  const isElectron = useIsElectron();
  const ipc = useIPC();

  const onLogin = () => {
    createAuthCode();
  };

  async function coreSignInClicked() {
    try {
      setLoading(true);

      // Store redirectToPath in localStorage if it exists
      if (redirectToPath) {
        localStorage.removeItem('redirectToPath');
        localStorage.setItem('redirectToPath', redirectToPath as string);
      }

      // Use better-auth CORE OAuth
      await authClient.signIn.oauth2({
        providerId: 'redplanethq_core',
        callbackURL: redirectToPath ? (redirectToPath as string) : '/home',
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setLoading(false);
      console.error('CORE sign in error:', err);
      window.alert('Oops! Something went wrong with authentication.');
    }
  }

  if (isElectron) {
    return (
      <AuthGuard>
        <AuthLayout>
          <div className="flex flex-col w-[360px] items-center">
            <h1 className="text-lg text-center">Welcome</h1>
            <div className="text-center text-muted-foreground mt-1 mb-8">
              Your second brain, supercharging dev life with AI.
            </div>
            <Button
              variant="secondary"
              className="w-fit"
              onClick={onLogin}
              isLoading={isLoading || loading}
            >
              Login
            </Button>
          </div>
        </AuthLayout>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <AuthLayout>
        <div className="flex flex-col w-[360px]">
          <h1 className="text-lg text-center">Welcome</h1>
          <div className="text-center text-muted-foreground mt-1 mb-8">
            Your second brain, supercharging dev life with AI.
          </div>

          <div className="flex flex-col gap-2 items-center">
            <Button
              variant="secondary"
              className="gap-2 w-fit"
              size="lg"
              onClick={coreSignInClicked}
              isLoading={loading}
            >
              <CoreLogo size={18} /> Login with Core
            </Button>
          </div>
        </div>
      </AuthLayout>
    </AuthGuard>
  );
}
