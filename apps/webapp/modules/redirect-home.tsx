import { Loader } from '@redplanethq/ui';
import { useRouter } from 'next/router';
import * as React from 'react';

import { SessionAuth } from 'common/wrappers/session-auth';
import { UserDataWrapper } from 'common/wrappers/user-data-wrapper';

import { UserContext } from 'store/user-context';

export function RedirectHome() {
  const user = React.useContext(UserContext);
  const router = useRouter();

  React.useEffect(() => {
    if (user?.workspace) {
      router.replace('/home');
    }

    // Check if they have invites
    else {
      router.replace('/onboarding');
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.workspace]);

  return <Loader />;
}

RedirectHome.getLayout = function getLayout(page: React.ReactElement) {
  return (
    <SessionAuth>
      <UserDataWrapper>{page}</UserDataWrapper>
    </SessionAuth>
  );
};
