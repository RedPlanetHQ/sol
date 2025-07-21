import { PrismaClient } from '@prisma/client';
import {
  IntegrationPayloadEventType,
  ParsedQuery,
  Task,
} from '@redplanethq/sol-sdk';
import { convertTiptapJsonToHtml } from '@sol/editor-extensions';

import { IntegrationsService } from 'modules/integrations/integrations.service';

export type TransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

export async function handleCalendarTask(
  prisma: TransactionClient,
  integrationsService: IntegrationsService,
  workspaceId: string,
  userId: string,
  type: string,
  task: Task,
) {
  const integrationAccount = await prisma.integrationAccount.findFirst({
    where: {
      integrationDefinition: { slug: 'google-calendar' },
      deleted: null,
      workspaceId,
    },
    include: {
      integrationDefinition: true,
    },
  });

  if (!integrationAccount) {
    return undefined;
  }

  // TODO: edit this to right event
  return await integrationsService.runIntegrationTrigger(
    integrationAccount.integrationDefinition,
    {
      event: IntegrationPayloadEventType.INTEGRATION_TASK_UPDATED,
      eventBody: {
        integrationAccount,
        type,
        task,
      },
    },
    userId,
  );
}

export function getTaskContent(task: Task) {
  let body = '';
  if (task.page?.description) {
    const descriptionJson = JSON.parse(task.page.description);
    body = convertTiptapJsonToHtml(descriptionJson);
  }
  return {
    title: task.page.title,
    body,
    state: task.status,
    startTime: task.startTime,
    endTime: task.endTime,
    recurrence: task.recurrence,
    scheduleText: task.scheduleText,
    dueDate: task.dueDate,
    remindAt: task.remindAt,
    tags: task.tags,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getCurrentTaskIds = (tiptapJson: any) => {
  const taskIds: string[] = [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const traverseNodes = (node: any) => {
    // Check if current node is a task with an id
    if (node.type === 'taskItem' && node.attrs?.id) {
      taskIds.push(node.attrs.id);
    }

    // Recursively traverse child nodes if they exist
    if (node.content) {
      node.content.forEach(traverseNodes);
    }
  };

  // Start traversal from the root
  traverseNodes(tiptapJson);

  return taskIds;
};

/**
 * Parse a GitHub-style search query
 * Examples:
 * - "meeting status:todo"
 * - "report due:>2023-04-01 due:<2023-04-30"
 * - "list:abc123 is:subtask tag:urgent"
 */
export function parseSearchQuery(query: string): ParsedQuery {
  const result: ParsedQuery = {
    textSearch: '',
    filters: {},
  };

  // Extract special filters using regex
  const textParts: string[] = [];

  // Split the query by spaces, but respect quoted strings
  const parts = splitQueryPreservingQuotes(query);

  for (const part of parts) {
    // Check if this part is a special filter
    if (part.includes(':')) {
      const [key, value] = part.split(':', 2);

      switch (key.toLowerCase()) {
        case 'status':
          result.filters.status = value;
          break;

        case 'list':
          result.filters.listId = value;
          break;

        case 'parent':
          result.filters.parentId = value;
          break;

        case 'due':
          if (!result.filters.dueDate) {
            result.filters.dueDate = {};
          }

          if (value.startsWith('>')) {
            result.filters.dueDate.after = new Date(value.substring(1));
          } else if (value.startsWith('<')) {
            result.filters.dueDate.before = new Date(value.substring(1));
          } else {
            // Handle exact date - create a range for the full day
            const exactDate = new Date(value);
            const nextDay = new Date(exactDate);
            nextDay.setDate(nextDay.getDate() + 1);

            result.filters.dueDate.after = exactDate;
            result.filters.dueDate.before = nextDay;
          }
          break;

        case 'is':
          if (value.toLowerCase() === 'subtask') {
            result.filters.isSubtask = true;
          }

          if (value.toLowerCase() === 'unplanned') {
            result.filters.isUnplanned = true;
          }
          break;

        case 'number':
          result.filters.number = value;
          break;

        case 'assignee':
          result.filters.assignee = value;
          break;

        default:
          // If it's not a recognized filter, treat it as text
          textParts.push(part);
      }
    } else {
      // Regular search term
      textParts.push(part);
    }
  }

  // Join the remaining parts as the text search
  result.textSearch = textParts.join(' ').trim();

  return result;
}

/**
 * Split a query string by spaces while preserving quoted sections
 */
function splitQueryPreservingQuotes(query: string): string[] {
  const parts: string[] = [];
  let currentPart = '';
  let inQuotes = false;

  for (let i = 0; i < query.length; i++) {
    const char = query[i];

    if (char === '"') {
      inQuotes = !inQuotes;
      currentPart += char;
    } else if (char === ' ' && !inQuotes) {
      if (currentPart) {
        parts.push(currentPart);
        currentPart = '';
      }
    } else {
      currentPart += char;
    }
  }

  // Add the last part if there is one
  if (currentPart) {
    parts.push(currentPart);
  }

  // Remove quotes from quoted parts
  return parts.map((part) => {
    if (part.startsWith('"') && part.endsWith('"')) {
      return part.substring(1, part.length - 1);
    }
    return part;
  });
}
