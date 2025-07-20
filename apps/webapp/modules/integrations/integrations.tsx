import { useSearchParams } from 'next/navigation';

import { Logo } from 'common/logo';
import { SessionAuth } from 'common/wrappers/session-auth';

export function Integrations() {
  const searchParams = useSearchParams();
  const success = searchParams.get('success');
  const integrationName = searchParams.get('integrationName');

  if (success === 'false') {
    return (
      <SessionAuth>
        <div className="p-6 container flex items-center flex-col gap-2">
          <Logo width={100} height={100} />
          Connecting {integrationName} has failed, try again
        </div>
      </SessionAuth>
    );
  }

  return (
    <SessionAuth>
      <div className="p-6 container flex items-center flex-col gap-2">
        <Logo width={100} height={100} />
        You have successfully connected integration, you can close this window.
      </div>
    </SessionAuth>
  );
}
