import axios from 'axios';
import pRetry from 'p-retry';

async function getPersonalAccessToken(code: string) {
  const response = await axios.post('/api/v1/users/api-key-for-code', {
    code,
  });

  const token = response.data.token;

  return {
    token,
  };
}

async function getCookiesSet(token: string) {
  try {
    console.log('getCookiesSet', token);

    await axios.get('/api/auth/get-session', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    window.location.reload();
  } catch (e) {
    console.log('error', e);
  }
}

export const getCookies = async (code: string) => {
  const indexResult = await pRetry(() => getPersonalAccessToken(code), {
    // this means we're polling, same distance between each attempt
    factor: 1,
    retries: 100,
    minTimeout: 1000,
  });

  console.log('indexResult', indexResult);
  await getCookiesSet(indexResult.token);
};
