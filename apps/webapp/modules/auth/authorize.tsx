import { Loader, useToast } from '@redplanethq/ui';
import { useRouter } from 'next/router';
import React from 'react';

import { Logo } from 'common/logo';
import { SessionAuth } from 'common/wrappers/session-auth';

import { useAuthorizeMutation } from 'services/users';

export function Authorize() {
  const {
    query: { code },
  } = useRouter();
  const [loading, setLoading] = React.useState(true);

  const { mutate: authorize } = useAuthorizeMutation({
    onError: () => {
      setLoading(false);
    },
    onSuccess: () => {
      setLoading(false);
    },
  });

  React.useEffect(() => {
    authorize({
      code: code as string,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return <Loader text="Verifying token" />;
  }

  return (
    <SessionAuth>
      <div className="p-6 container flex items-center flex-col gap-2">
        <Logo width={100} height={100} />
        You have successfully authorised, now you can return back to the app.
      </div>
    </SessionAuth>
  );
}
