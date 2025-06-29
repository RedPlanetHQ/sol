import { IntegrationAccount } from '@redplanethq/sol-sdk';
import axios from 'axios';

import { createActivity, getGithubData, getUserEvents, ActivityCreate } from './utils';

export async function handleSchedule(integrationAccount: IntegrationAccount) {
  const integrationConfiguration = integrationAccount.integrationConfiguration as {
    access_token: string;
  };
  const settings = integrationAccount.settings as { 
    lastSyncTime: string;
    lastUserEventTime?: string;
    username?: string;
  };
  // If lastSyncTime is not available, default to 1 day ago
  const lastSyncTime =
    settings.lastSyncTime || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const allowedReasons = [
    'assign',
    'review_requested',
    'mention',
    'state_change',
    'subscribed',
    'author',
    'approval_requested',
    'comment',
    'ci_activity',
    'invitation',
    'member_feature_requested',
    'security_alert',
    'security_advisory_credit',
    'team_mention',
  ];

  let page = 1;
  let hasMorePages = true;
  let notificationCount = 0;
  let userEventCount = 0;
  
  // If we have username but no lastUserEventTime, initialize it same as lastSyncTime
  if (settings.username && !settings.lastUserEventTime) {
    settings.lastUserEventTime = lastSyncTime;
  }

  while (hasMorePages) {
    const notifications = await getGithubData(
      `https://api.github.com/notifications?page=${page}&per_page=50&all=true&since=${lastSyncTime}`,
      integrationConfiguration.access_token,
    );

    // Check if notifications exists and has data
    if (notifications.length === 0) {
      hasMorePages = false;
      break;
    }
    page++;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filteredNotifications = notifications.filter((notification: any) =>
      allowedReasons.includes(notification.reason),
    );

    notificationCount += filteredNotifications?.length || 0;

    const activity: ActivityCreate[] = [];

    await Promise.all(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      filteredNotifications.map(async (notification: any) => {
        const { reason, subject, repository } = notification;

        let title = '';
        let url = '';
        let sourceURL = '';
        let sourceId = '';
        let githubData;
        const isComment = subject.latest_comment_url?.includes('/comments/') || false;
        const isIssue = subject.type === 'Issue';
        const isPullRequest = subject.type === 'PullRequest';

        // Get data URL based on notification type
        if (subject.latest_comment_url) {
          url = subject.latest_comment_url;
        } else if (subject.url) {
          url = subject.url;
        }

        if (url) {
          // Fetch the full data from GitHub API
          githubData = await getGithubData(url, integrationConfiguration.access_token);
          sourceId = githubData.id?.toString() || '';
          sourceURL = githubData.html_url || url;

          // Create structured text based on notification reason
          switch (reason) {
            case 'approval_requested':
              title = `Deployment approval requested: ${repository.full_name}`;
              break;

            case 'assign':
              title = `${isIssue ? 'Issue' : 'PR'} assigned to you: #${githubData.number} - ${githubData.title}`;
              break;

            case 'author':
              if (isComment) {
                title = `New comment on your ${isIssue ? 'issue' : 'PR'} by ${githubData.user?.login}: ${githubData.body}`;
              } else {
                title = `You created this ${isIssue ? 'issue' : 'PR'}: #${githubData.number} - ${githubData.title}`;
              }
              break;

            case 'comment':
              title = `New comment by ${githubData.user?.login} in ${repository.full_name}: ${githubData.body}`;
              break;

            case 'manual':
              title = `You subscribed to: #${githubData.number} - ${githubData.title}`;
              break;

            case 'mention':
              title = `@mentioned by ${githubData.user?.login} in ${repository.full_name}: ${githubData.body}`;
              break;

            case 'review_requested':
              title = `PR review requested in ${repository.full_name}: #${githubData.number} - ${githubData.title}`;
              break;

            case 'state_change': {
              let stateInfo = '';
              if (githubData.state) {
                stateInfo = `to ${githubData.state}`;
              } else if (githubData.merged) {
                stateInfo = 'to merged';
              } else if (githubData.closed_at) {
                stateInfo = 'to closed';
              }
              title = `State changed ${stateInfo} in ${repository.full_name}: #${githubData.number} - ${githubData.title}`;
              break;
            }

            case 'subscribed':
              if (isComment) {
                title = `New comment on watched ${isIssue ? 'issue' : 'PR'} in ${repository.full_name} by ${githubData.user?.login}: ${githubData.body}`;
              } else if (isPullRequest) {
                title = `New PR created in watched repo ${repository.full_name}: #${githubData.number} - ${githubData.title}`;
              } else if (isIssue) {
                title = `New issue created in watched repo ${repository.full_name}: #${githubData.number} - ${githubData.title}`;
              } else {
                title = `Update in watched repo ${repository.full_name}: #${githubData.number} - ${githubData.title}`;
              }
              break;

            case 'team_mention':
              title = `Your team was mentioned in ${repository.full_name}`;
              break;

            default:
              title = `GitHub notification: ${repository.full_name}`;
              break;
          }

          activity.push({
            url,
            title,
            sourceId,
            sourceURL,
            integrationAccountId: integrationAccount.id,
          });
        }
      }),
    );

    if (activity.length > 0) {
      await createActivity(activity);
    }

    await axios.post(`/api/v1/integration_account/${integrationAccount.id}`, {
      settings: { ...settings, lastSyncTime: new Date().toISOString() },
    });
  }

  // Process user-initiated events (direct actions) for more complete activity tracking
  if (settings.username) {
    let userEventsPage = 1;
    let hasMoreUserEvents = true;
    
    while (hasMoreUserEvents) {
      const userEvents = await getUserEvents(
        settings.username,
        userEventsPage,
        integrationConfiguration.access_token,
        settings.lastUserEventTime
      );

      if (!userEvents || userEvents.length === 0) {
        hasMoreUserEvents = false;
        break;
      }
      userEventsPage++;
      
      // Track events initiated by the user that might not appear in notifications
      const userActivity: ActivityCreate[] = [];
      
      for (const event of userEvents) {
        // Skip events we've already processed
        const eventTime = new Date(event.created_at).toISOString();
        if (settings.lastUserEventTime && eventTime <= settings.lastUserEventTime) {
          continue;
        }
        
        let title = '';
        let url = '';
        let sourceURL = '';
        let sourceId = '';
        
        switch (event.type) {
          case 'PullRequestEvent':
            if (event.payload.action === 'opened' || event.payload.action === 'reopened') {
              const pr = event.payload.pull_request;
              title = `You created PR #${pr.number}: ${pr.title}`;
              sourceURL = pr.html_url;
              sourceId = `pr_${pr.id}`;
              url = pr.url;
            }
            break;
            
          case 'IssuesEvent':
            if (event.payload.action === 'opened' || event.payload.action === 'reopened') {
              const issue = event.payload.issue;
              title = `You created issue #${issue.number}: ${issue.title}`;
              sourceURL = issue.html_url;
              sourceId = `issue_${issue.id}`;
              url = issue.url;
            }
            break;
            
          case 'IssueCommentEvent':
            if (event.payload.action === 'created') {
              const issue = event.payload.issue;
              const comment = event.payload.comment;
              title = `You commented on issue #${issue.number}: ${comment.body?.substring(0, 100)}${comment.body?.length > 100 ? '...' : ''}`;
              sourceURL = comment.html_url;
              sourceId = `comment_${comment.id}`;
              url = comment.url;
            }
            break;
            
          case 'PullRequestReviewEvent':
            const review = event.payload.review;
            const pr = event.payload.pull_request;
            title = `You reviewed PR #${pr.number}: ${review.state}`;
            sourceURL = review.html_url;
            sourceId = `review_${review.id}`;
            url = review.url;
            break;
            
          case 'PullRequestReviewCommentEvent':
            if (event.payload.action === 'created') {
              const pr = event.payload.pull_request;
              const comment = event.payload.comment;
              title = `You commented on PR #${pr.number}: ${comment.body?.substring(0, 100)}${comment.body?.length > 100 ? '...' : ''}`;
              sourceURL = comment.html_url;
              sourceId = `pr_comment_${comment.id}`;
              url = comment.url;
            }
            break;
            
          case 'CommitCommentEvent':
            const comment = event.payload.comment;
            title = `You commented on commit ${comment.commit_id?.substring(0, 7)}: ${comment.body?.substring(0, 100)}${comment.body?.length > 100 ? '...' : ''}`;
            sourceURL = comment.html_url;
            sourceId = `commit_comment_${comment.id}`;
            url = comment.url;
            break;
        }
        
        if (title && url) {
          userActivity.push({
            url,
            title,
            sourceId,
            sourceURL,
            integrationAccountId: integrationAccount.id,
          });
        }
      }
      
      if (userActivity.length > 0) {
        await createActivity(userActivity);
        userEventCount += userActivity.length;
      }
    }
    
    // Update lastUserEventTime in settings
    await axios.post(`/api/v1/integration_account/${integrationAccount.id}`, {
      settings: { ...settings, lastUserEventTime: new Date().toISOString() },
    });
  }

  return { 
    message: `Processed ${notificationCount} notifications and ${userEventCount} user events from GitHub` 
  };
}
