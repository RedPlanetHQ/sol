import axios from 'axios';

export interface ActivityCreate {
  url: string;
  title: string;
  sourceURL: string;
  integrationAccountId: string;
}

export async function createActivity(activity: ActivityCreate[]) {
  for (const act of activity) {
    const existingTask = await getTaskForSource(act.sourceURL);
    console.log(`existingTask: ${existingTask}`);
    const { title, url, ...otherAct } = act;

    console.log(`otherAct: ${otherAct}`);
    await axios.post('/api/v1/activity', {
      ...otherAct,
      text: `${title} \n URL: ${url}`,
      taskId: existingTask ? existingTask.id : null,
    });
  }
}

export async function getTaskForSource(sourceURL: string) {
  try {
    return (await axios.get(`/api/v1/tasks/source/${sourceURL}`, {})).data;
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

/**
 * Get user events (PRs, issues, comments) and also issues assigned to the user by themselves.
 */
export async function getUserEvents(
  username: string,
  page: number,
  accessToken: string,
  since?: string,
) {
  try {
    const formattedDate = since ? encodeURIComponent(since.split('T')[0]) : '';
    // Search for user's PRs, issues, and comments since the last sync
    const [
      prsResponse,
      issuesResponse,
      commentsResponse,
      // For self-assigned issues, we need to fetch issues assigned to the user and authored by the user
      assignedIssuesResponse,
    ] = await Promise.all([
      // Search for PRs created by user
      getGithubData(
        `https://api.github.com/search/issues?q=author:${username}+type:pr+created:>${formattedDate}&sort=created&order=desc&page=${page}&per_page=10`,
        accessToken,
      ),
      // Search for issues created by user
      getGithubData(
        `https://api.github.com/search/issues?q=author:${username}+type:issue+created:>${formattedDate}&sort=created&order=desc&page=${page}&per_page=10`,
        accessToken,
      ),
      // Search for issues/PRs the user commented on
      getGithubData(
        `https://api.github.com/search/issues?q=commenter:${username}+updated:>${formattedDate}&sort=updated&order=desc&page=${page}&per_page=10`,
        accessToken,
      ),
      // Search for issues assigned to the user and authored by the user (self-assigned)
      getGithubData(
        `https://api.github.com/search/issues?q=assignee:${username}+author:${username}+type:issue+updated:>${formattedDate}&sort=updated&order=desc&page=${page}&per_page=10`,
        accessToken,
      ),
    ]);

    console.log('PRs found:', prsResponse?.items?.length || 0);
    console.log('Issues found:', issuesResponse?.items?.length || 0);
    console.log('Comments found:', commentsResponse?.items?.length || 0);
    console.log('Self-assigned issues found:', assignedIssuesResponse?.items?.length || 0);

    // Return simplified results - combine PRs, issues, commented items, and self-assigned issues
    const results = [
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(prsResponse?.items || []).map((item: any) => ({ ...item, type: 'pr' })),
      ...(issuesResponse?.items || [])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((item: any) => !item.pull_request)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((item: any) => ({ ...item, type: 'issue' })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(commentsResponse?.items || []).map((item: any) => ({
        ...item,
        type: item.pull_request ? 'pr_comment' : 'issue_comment',
      })),
      // Add self-assigned issues, but only if not already present in issuesResponse
      ...(assignedIssuesResponse?.items || [])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((item: any) => {
          // Only include if not already in issuesResponse (by id)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return !(issuesResponse?.items || []).some((issue: any) => issue.id === item.id);
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((item: any) => ({
          ...item,
          type: 'self_assigned_issue',
        })),
    ];

    // Sort by created_at descending
    results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return results;
  } catch (error) {
    console.error('Error fetching user activity via search:', error);
    return [];
  }
}
