import axios from 'axios';
import { IntegrationAccount } from '@redplanethq/sol-sdk';

interface LinearActivityCreateParams {
  url: string;
  title: string;
  sourceId: string;
  sourceURL: string;
  integrationAccountId: string;
}

interface LinearSettings {
  lastIssuesSync?: string;
  lastCommentsSync?: string;
  lastUserActionsSync?: string;
}

// Event types to track for user activities
enum LinearEventType {
  ISSUE_CREATED = 'issue_created',
  ISSUE_UPDATED = 'issue_updated',
  ISSUE_COMMENTED = 'issue_commented',
  ISSUE_ASSIGNED = 'issue_assigned',
  ISSUE_STATUS_CHANGED = 'issue_status_changed',
  ISSUE_COMPLETED = 'issue_completed',
  ISSUE_REOPENED = 'issue_reopened',
  USER_MENTIONED = 'user_mentioned',
  REACTION_ADDED = 'reaction_added',
  ISSUE_SUBSCRIBED = 'issue_subscribed',
  ISSUE_PRIORITY_CHANGED = 'issue_priority_changed',
  PROJECT_UPDATED = 'project_updated',
  CYCLE_UPDATED = 'cycle_updated',
}

// GraphQL fragments for reuse
const USER_FRAGMENT = `
  fragment UserFields on User {
    id
    name
    displayName
  }
`;

const ISSUE_FRAGMENT = `
  fragment IssueFields on Issue {
    id
    identifier
    title
    description
    url
    createdAt
    updatedAt
    archivedAt
    state {
      id
      name
      type
    }
    team {
      id
      name
    }
    assignee {
      ...UserFields
    }
    creator {
      ...UserFields
    }
    priority
  }
  ${USER_FRAGMENT}
`;

const COMMENT_FRAGMENT = `
  fragment CommentFields on Comment {
    id
    body
    createdAt
    updatedAt
    user {
      ...UserFields
    }
    issue {
      ...IssueFields
    }
  }
  ${USER_FRAGMENT}
  ${ISSUE_FRAGMENT}
`;

/**
 * Creates an activity in the system based on Linear data
 */
async function createActivity(params: LinearActivityCreateParams) {
  try {
    // This would call the Sol SDK to create an activity
    console.log(`Creating activity: ${params.title}`);
    // Would be implemented via Sol SDK similar to GitHub integration
  } catch (error) {
    console.error('Error creating activity:', error);
  }
}

/**
 * Fetches user information from Linear
 */
async function fetchUserInfo(accessToken: string) {
  try {
    const query = `
      query {
        viewer {
          id
          name
          email
        }
      }
    `;

    const response = await axios.post(
      'https://api.linear.app/graphql',
      { query },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    return response.data.data.viewer;
  } catch (error) {
    console.error('Error fetching user info:', error);
    throw error;
  }
}

/**
 * Fetches recent issues relevant to the user (created, assigned, or subscribed)
 */
async function fetchRecentIssues(accessToken: string, lastSyncTime: string) {
  try {
    const query = `
      query RecentIssues($lastSyncTime: DateTime) {
        issues(
          filter: {
            updatedAt: { gt: $lastSyncTime }
          },
          first: 50,
          orderBy: updatedAt
        ) {
          nodes {
            ...IssueFields
            history {
              nodes {
                id
                createdAt
                updatedAt
                fromStateId
                toStateId
                fromAssigneeId
                toAssigneeId
                fromPriority
                toPriority
              }
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
      ${ISSUE_FRAGMENT}
    `;

    const response = await axios.post(
      'https://api.linear.app/graphql',
      { 
        query,
        variables: {
          lastSyncTime
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    return response.data.data.issues;
  } catch (error) {
    console.error('Error fetching recent issues:', error);
    throw error;
  }
}

/**
 * Fetches recent comments on issues relevant to the user
 */
async function fetchRecentComments(accessToken: string, lastSyncTime: string) {
  try {
    const query = `
      query RecentComments($lastSyncTime: DateTime) {
        comments(
          filter: {
            updatedAt: { gt: $lastSyncTime }
          },
          first: 50,
          orderBy: updatedAt
        ) {
          nodes {
            ...CommentFields
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
      ${COMMENT_FRAGMENT}
    `;

    const response = await axios.post(
      'https://api.linear.app/graphql',
      { 
        query,
        variables: {
          lastSyncTime
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    return response.data.data.comments;
  } catch (error) {
    console.error('Error fetching recent comments:', error);
    throw error;
  }
}

/**
 * Process issue activities and create appropriate activity records
 */
async function processIssueActivities(
  issues: any[],
  userId: string,
  integrationAccount: IntegrationAccount,
  isCreator: boolean = false
) {
  const activities = [];

  for (const issue of issues) {
    try {
      // Skip issues that don't involve the user
      const isAssignee = issue.assignee?.id === userId;
      const isCreatedByUser = issue.creator?.id === userId;
      
      if (!isAssignee && !isCreatedByUser && !isCreator) {
        continue;
      }

      // Process new issues created by the user
      if (isCreatedByUser) {
        activities.push({
          url: `https://api.linear.app/issue/${issue.id}`,
          title: `You created issue ${issue.identifier}: ${issue.title}`,
          sourceId: `linear-issue-created-${issue.id}`,
          sourceURL: issue.url,
          integrationAccountId: integrationAccount.id,
        });
      }

      // Process issues assigned to the user (if not created by them)
      if (isAssignee && !isCreatedByUser) {
        activities.push({
          url: `https://api.linear.app/issue/${issue.id}`,
          title: `${issue.creator?.name || 'Someone'} assigned you issue ${issue.identifier}: ${issue.title}`,
          sourceId: `linear-issue-assigned-${issue.id}`,
          sourceURL: issue.url,
          integrationAccountId: integrationAccount.id,
        });
      }

      // Process status changes
      if (issue.history && issue.history.nodes) {
        for (const historyItem of issue.history.nodes) {
          if (historyItem.toStateId && historyItem.fromStateId !== historyItem.toStateId) {
            // Skip if not relevant to the user
            if (!isAssignee && !isCreatedByUser) {
              continue;
            }

            const stateType = issue.state?.type;
            let eventType = LinearEventType.ISSUE_STATUS_CHANGED;
            let statusText = `moved to ${issue.state?.name || 'a new status'}`;

            // Special handling for completion and reopening
            if (stateType === 'completed') {
              eventType = LinearEventType.ISSUE_COMPLETED;
              statusText = 'marked as completed';
            } else if (stateType === 'canceled') {
              statusText = 'canceled';
            } else if (historyItem.fromStateId && !historyItem.toStateId) {
              eventType = LinearEventType.ISSUE_REOPENED;
              statusText = 'reopened';
            }

            const title = isCreatedByUser || isAssignee
              ? `You ${statusText} issue ${issue.identifier}: ${issue.title}`
              : `${issue.assignee?.name || 'Someone'} ${statusText} issue ${issue.identifier}: ${issue.title}`;

            activities.push({
              url: `https://api.linear.app/issue/${issue.id}`,
              title,
              sourceId: `linear-${eventType}-${issue.id}-${historyItem.id}`,
              sourceURL: issue.url,
              integrationAccountId: integrationAccount.id,
            });
          }

          // Process priority changes
          if (historyItem.toPriority && historyItem.fromPriority !== historyItem.toPriority) {
            // Skip if not relevant to the user
            if (!isAssignee && !isCreatedByUser) {
              continue;
            }

            const priorityMap: Record<number, string> = {
              0: 'No priority',
              1: 'Urgent',
              2: 'High',
              3: 'Medium',
              4: 'Low',
            };
            
            const newPriority = priorityMap[historyItem.toPriority] || 'a new priority';
            
            const title = isCreatedByUser
              ? `You changed priority of issue ${issue.identifier} to ${newPriority}`
              : `${issue.creator?.name || 'Someone'} changed priority of issue ${issue.identifier} to ${newPriority}`;
            
            activities.push({
              url: `https://api.linear.app/issue/${issue.id}`,
              title,
              sourceId: `linear-issue-priority-${issue.id}-${historyItem.id}`,
              sourceURL: issue.url,
              integrationAccountId: integrationAccount.id,
            });
          }

          // Process assignment changes
          if (historyItem.toAssigneeId && historyItem.fromAssigneeId !== historyItem.toAssigneeId) {
            // Only relevant if user is newly assigned or is the creator
            if (historyItem.toAssigneeId !== userId && !isCreatedByUser) {
              continue;
            }
            
            const title = historyItem.toAssigneeId === userId
              ? `You were assigned issue ${issue.identifier}: ${issue.title}`
              : `You assigned issue ${issue.identifier} to ${issue.assignee?.name || 'someone'}`;
            
            activities.push({
              url: `https://api.linear.app/issue/${issue.id}`,
              title,
              sourceId: `linear-issue-reassigned-${issue.id}-${historyItem.id}`,
              sourceURL: issue.url,
              integrationAccountId: integrationAccount.id,
            });
          }
        }
      }
    } catch (error) {
      console.error(`Error processing issue ${issue.id}:`, error);
    }
  }

  // Create activities in the system
  for (const activity of activities) {
    await createActivity(activity);
  }

  return activities.length;
}

/**
 * Process comment activities and create appropriate activity records
 */
async function processCommentActivities(
  comments: any[],
  userId: string,
  integrationAccount: IntegrationAccount
) {
  const activities = [];

  for (const comment of comments) {
    try {
      const isCommenter = comment.user?.id === userId;
      const isIssueCreator = comment.issue?.creator?.id === userId;
      const isAssignee = comment.issue?.assignee?.id === userId;
      
      // Skip if not relevant to user
      if (!isCommenter && !isIssueCreator && !isAssignee) {
        // TODO: Check for mentions in the comment body
        continue;
      }

      let title;
      let sourceId;

      if (isCommenter) {
        // Comment created by the user
        title = `You commented on issue ${comment.issue.identifier}: ${truncateText(comment.body, 100)}`;
        sourceId = `linear-comment-created-${comment.id}`;
      } else if (isAssignee || isIssueCreator) {
        // Comment on issue where user is assignee or creator
        const relation = isAssignee ? 'your assigned issue' : 'your issue';
        title = `${comment.user?.name || 'Someone'} commented on ${relation} ${comment.issue.identifier}: ${truncateText(comment.body, 100)}`;
        sourceId = `linear-comment-received-${comment.id}`;
      }

      if (title && sourceId) {
        activities.push({
          url: `https://api.linear.app/comment/${comment.id}`,
          title,
          sourceId,
          sourceURL: `${comment.issue.url}#comment-${comment.id}`,
          integrationAccountId: integrationAccount.id,
        });
      }
    } catch (error) {
      console.error(`Error processing comment ${comment.id}:`, error);
    }
  }

  // Create activities in the system
  for (const activity of activities) {
    await createActivity(activity);
  }

  return activities.length;
}

/**
 * Helper function to truncate text with ellipsis
 */
function truncateText(text: string, maxLength: number): string {
  if (!text) return '';
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

/**
 * Helper function to get default sync time (24 hours ago)
 */
function getDefaultSyncTime(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString();
}

/**
 * Main function to handle scheduled sync for Linear integration
 */
export async function handleSchedule(integrationAccount: IntegrationAccount) {
  try {
    // Check if we have a valid access token
    if (!integrationAccount.accessToken) {
      console.error('No access token found for Linear integration');
      return { message: 'No access token found' };
    }

    // Get settings or initialize if not present
    const settings: LinearSettings = integrationAccount.settings || {};
    
    // Default to 24 hours ago if no last sync times
    const lastIssuesSync = settings.lastIssuesSync || getDefaultSyncTime();
    const lastCommentsSync = settings.lastCommentsSync || getDefaultSyncTime();
    const lastUserActionsSync = settings.lastUserActionsSync || getDefaultSyncTime();

    // Fetch user info to identify activities relevant to them
    const user = await fetchUserInfo(integrationAccount.accessToken);
    
    if (!user || !user.id) {
      console.error('Failed to fetch user info from Linear');
      return { message: 'Failed to fetch user info' };
    }

    // Process all issue activities (created, assigned, updated, etc.)
    let issueCount = 0;
    try {
      const issues = await fetchRecentIssues(integrationAccount.accessToken, lastIssuesSync);
      if (issues && issues.nodes) {
        issueCount = await processIssueActivities(issues.nodes, user.id, integrationAccount);
      }
    } catch (error) {
      console.error('Error processing issues:', error);
    }

    // Process all comment activities
    let commentCount = 0;
    try {
      const comments = await fetchRecentComments(integrationAccount.accessToken, lastCommentsSync);
      if (comments && comments.nodes) {
        commentCount = await processCommentActivities(comments.nodes, user.id, integrationAccount);
      }
    } catch (error) {
      console.error('Error processing comments:', error);
    }

    // TODO: Implement additional activity types:
    // - Reaction tracking
    // - PR/Merge request tracking (if supported by Linear)
    // - Project and cycle updates
    // - Team updates and notifications
    // - Mention detection in descriptions and comments

    // Update last sync times
    const newSyncTime = new Date().toISOString();
    
    // Save new settings
    integrationAccount.settings = {
      ...settings,
      lastIssuesSync: newSyncTime,
      lastCommentsSync: newSyncTime,
      lastUserActionsSync: newSyncTime,
    };

    return {
      message: `Synced ${issueCount} issues and ${commentCount} comments from Linear`,
    };
  } catch (error) {
    console.error('Error in Linear scheduled sync:', error);
    return {
      message: `Error syncing Linear activities: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * The main handler for the scheduled sync event
 */
export async function scheduleHandler(integrationAccount: IntegrationAccount) {
  return handleSchedule(integrationAccount);
}