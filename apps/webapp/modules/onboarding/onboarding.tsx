/* eslint-disable react/no-unescaped-entities */

import { useRouter } from 'next/router';
import React from 'react';

import { AuthLayout } from 'modules/auth';

import { SessionAuth } from 'common/wrappers/session-auth';
import { UserDataWrapper } from 'common/wrappers/user-data-wrapper';

import { UserContext } from 'store/user-context';

import { OnboardingForm } from './onboarding-form';

export function OnboardingComponent() {
  const user = React.useContext(UserContext);
  const router = useRouter();

  React.useEffect(() => {
    if (user?.workspace) {
      router.replace(`/home`);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.workspace]);

  return (
    <AuthLayout>
      <div className="flex flex-col w-[360px]">
        <h1 className="text-lg">✋ Welcome to Sol</h1>
        <div className="text-muted-foreground mt-1 mb-8">
          We just need to take couple of information before we proceed
        </div>

        <div className="flex flex-col gap-2">
          <OnboardingForm />
        </div>
      </div>
    </AuthLayout>
  );
}

export function Onboarding() {
  return (
    <SessionAuth>
      <UserDataWrapper>
        <OnboardingComponent />
      </UserDataWrapper>
    </SessionAuth>
  );
}
