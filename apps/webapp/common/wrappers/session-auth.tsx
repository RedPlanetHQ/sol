import { useRouter } from 'next/router';
import React, { useEffect } from 'react';

import { useSession } from 'common/lib/auth-client';

export const SessionAuth = ({ children }: { children: React.ReactNode }) => {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isPending && !session) {
      router.replace('/auth');
    }
  }, [isPending, session, router]);

  if (isPending) {
    return null;
  }

  if (!session) {
    return null;
  }

  return <>{children}</>;
};
