import axios from 'axios';
import pRetry from 'p-retry';

import type { IPCRenderer } from 'hooks/ipc';

async function getPersonalAccessToken(code: string) {
  const response = await axios.post('/api/v1/users/api-key-for-code', {
    code,
  });

  const token = response.data.token;

  return {
    token,
  };
}

export const getCookies = async (code: string, ipc: IPCRenderer) => {
  const indexResult = await pRetry(() => getPersonalAccessToken(code), {
    // this means we're polling, same distance between each attempt
    factor: 1,
    retries: 100,
    minTimeout: 1000,
  });

  if (indexResult.token) {
    ipc.store.set('token', indexResult.token);
  }
};
