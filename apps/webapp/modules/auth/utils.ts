import axios from 'axios';
import pRetry from 'p-retry';

async function getPersonalAccessToken(code: string) {
  const response = await axios.post('/api/v1/users/pat-for-code', {
    code,
  });

  const token = response.data.token;

  return {
    token,
  };
}

async function getCookiesSet(token: string) {
  try {
    await axios.get('/api/v1/users/pat-authentication', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    window.location.reload();
  } catch (e) {}
}

export const getCookies = async (code: string) => {
  const indexResult = await pRetry(() => getPersonalAccessToken(code), {
    // this means we're polling, same distance between each attempt
    factor: 1,
    retries: 100,
    minTimeout: 1000,
  });

  await getCookiesSet(indexResult.token);
};
