import axios from 'axios';

import { getGithubData } from './utils';

export async function integrationCreate(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any,
) {
  const { oauthResponse, integrationDefinition } = data;
  const integrationConfiguration = {
    refresh_token: oauthResponse.refresh_token,
    access_token: oauthResponse.access_token,
  };

  const user = await getGithubData(
    'https://api.github.com/user',
    integrationConfiguration.access_token,
  );

  const payload = {
    settings: {
      login: user.login,
      username: user.login,
      schedule: {
        frequency: '*/15 * * * *',
      },
    },
    accountId: user.id.toString(),
    config: integrationConfiguration,
    integrationDefinitionId: integrationDefinition.id,
  };

  const integrationAccount = (await axios.post(`/api/v1/integration_account`, payload)).data;

  return integrationAccount;
}
