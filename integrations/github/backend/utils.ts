import axios from 'axios';

export interface ActivityCreate {
  url: string;
  title: string;
  sourceId: string;
  sourceURL: string;
  integrationAccountId: string;
}

export async function createActivity(activity: ActivityCreate[]) {
  for (const act of activity) {
    const existingTask = await getTaskForSource(act.sourceId);
    const { title, url, ...otherAct } = act;

    await axios.post('/api/v1/activity', {
      ...otherAct,
      text: `${title} \n URL: ${url}`,
      taskId: existingTask ? existingTask.id : null,
    });
  }
}

export async function getTaskForSource(sourceId: string) {
  try {
    return (await axios.get(`/api/v1/tasks/source/${sourceId}`, {})).data;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  } catch (e: any) {
    return null;
  }
}

export async function getGithubData(url: string, accessToken: string) {
  return (
    await axios.get(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    })
  ).data;
}

export async function getUserEvents(username: string, page: number, accessToken: string, since?: string) {
  try {
    const url = `https://api.github.com/users/${username}/events?page=${page}&per_page=30`;
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    if (since) {
      // Filter events by date if since is provided
      return response.data.filter((event: any) => {
        return new Date(event.created_at).toISOString() > since;
      });
    }
    
    return response.data;
  } catch (error) {
    console.error('Error fetching user events:', error);
    return [];
  }
}
