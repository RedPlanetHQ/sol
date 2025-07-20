import { Loader } from '@redplanethq/ui';
import { useRouter } from 'next/router';
import React, { cloneElement, useEffect } from 'react';

import { useSession } from 'common/lib/auth-client';

interface Props {
  children: React.ReactElement;
}

export function AuthGuard(props: Props): React.ReactElement {
  const { children } = props;
  const router = useRouter();
  const { data: session, isPending } = useSession();

  useEffect(() => {
    if (!isPending && session) {
      router.replace('/home');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending, session]);

  if (isPending) {
    return <Loader />;
  }

  if (!session) {
    return cloneElement(children);
  }

  // Optionally, you could return null here since router.replace will redirect
  return null;
}
