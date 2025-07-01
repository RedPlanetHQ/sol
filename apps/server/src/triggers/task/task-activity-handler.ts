import { PrismaClient } from '@prisma/client';
import { Task, TaskHookContext } from '@redplanethq/sol-sdk';
import { schedules, task as triggerTask } from '@trigger.dev/sdk/v3';
import { createActivity } from 'triggers/utils';

const prisma = new PrismaClient();

/**
 * Generates a human-readable activity text for task create, update, and delete actions.
 * For update, it uses the changeData to be specific about what changed.
 */
function getActivityText(
  action: 'create' | 'update' | 'delete',
  task: Task,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  changeData?: Record<string, { oldValue: any; newValue: any }>,
): string | undefined {
  const title = task.page?.title;
  const id = task.id;
  const display = title ? `${title} (${id})` : id;

  if (action === 'create') {
    let details = `Created task "${display}" with status "${task.status || 'N/A'}"`;

    if (task.startTime) {
      details += `, starts on ${new Date(task.startTime).toLocaleString()}`;
    }
    if (task.dueDate) {
      details += `, due on ${new Date(task.dueDate).toLocaleString()}`;
    }
    if (task.recurrence?.length) {
      details += `, recurring: ${task.recurrence.join(', ')}`;
    }

    return `${details}.`;
  }

  if (action === 'delete') {
    return `Deleted task "${display}".`;
  }

  if (action === 'update' && changeData) {
    const changes: string[] = [];

    for (const [key, { oldValue, newValue }] of Object.entries(changeData)) {
      if (key === 'status') {
        changes.push(`status changed from "${oldValue}" to "${newValue}"`);
      } else if (key === 'dueDate') {
        changes.push(
          `due date changed from "${oldValue ? new Date(oldValue).toLocaleString() : 'none'}" to "${
            newValue ? new Date(newValue).toLocaleString() : 'none'
          }"`,
        );
      } else if (key === 'recurrence') {
        changes.push(
          `recurrence changed from "${(oldValue || []).join(', ')}" to "${(newValue || []).join(', ')}"`,
        );
      } else if (key === 'startTime') {
        changes.push(
          `start time changed from "${oldValue ? new Date(oldValue).toLocaleString() : 'none'}" to "${
            newValue ? new Date(newValue).toLocaleString() : 'none'
          }"`,
        );
      }
    }

    if (changes.length === 0) {
      return undefined;
    }

    return `Updated task "${display}": ${changes.join('; ')}.`;
  }

  return undefined;
}

async function createReminders(task: Task) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const taskMetadata = task.metadata as any;

  let awakeBefore =
    taskMetadata?.assignee && taskMetadata.assignee === 'assistant' ? 0 : 15;

  const reminderTime =
    new Date(task.startTime).getTime() - awakeBefore * 60 * 1000;

  if (reminderTime < Date.now()) {
    awakeBefore = 0;
  }

  // Create schedule to run daily 10 minutes before task start time
  const startTime = new Date(task.startTime);
  const reminderDate = new Date(startTime.getTime() - awakeBefore * 60 * 1000);
  const cronMinutes = reminderDate.getMinutes();
  const cronHours = reminderDate.getHours();

  const { id: scheduleId } = await schedules.create({
    task: `task-run-schedule`,
    cron: `${cronMinutes} ${cronHours} * * *`, // Run daily at startTime - 15min
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    timezone: (task.workspace.preferences as any).timezone,
    deduplicationKey: task.id,
    externalId: task.id,
  });

  // Save scheduleId in task metadata
  await prisma.task.update({
    where: { id: task.id },
    data: {
      metadata: {
        ...taskMetadata,
        scheduleId,
      },
    },
  });
}

async function clearReminders(task: Task) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const taskMetadata = task.metadata as any;

  // Delete existing schedule/run if exists
  if (taskMetadata?.scheduleId) {
    await schedules.del(taskMetadata.scheduleId);

    // Remove scheduleId from metadata
    await prisma.task.update({
      where: { id: task.id },
      data: {
        metadata: {
          ...taskMetadata,
          scheduleId: undefined,
        },
      },
    });
  }
}

export const taskActivityHandler = triggerTask({
  id: 'task-activity-handler',
  queue: {
    name: 'task-activity-handler',
    concurrencyLimit: 10,
  },
  run: async (payload: { task: Task; context: TaskHookContext }) => {
    const { task, context } = payload;

    if (context.action === 'create') {
      await createReminders(task);

      if (task.updatedBy === 'assistant') {
        return 'Created by assistant';
      }

      // Create activity text for creation
      const activityText = getActivityText('create', task);
      if (activityText) {
        await createActivity({
          text: activityText,
          workspaceId: task.workspaceId,
          taskId: task.id,
        });
      }
      return { message: 'Handled schedule create', activityText };
    }

    if (context.action === 'update') {
      if (
        context.changeData &&
        (context.changeData.recurrence?.newValue ||
          context.changeData.startTime?.newValue ||
          context.changeData.endTime?.newValue)
      ) {
        await clearReminders(task);
        // Create new schedule/run based on updated values
        await createReminders(task);
      }

      if (task.updatedBy === 'assistant') {
        return 'Updated by assistant';
      }

      // Create activity text for update, specifying what changed
      const activityText = getActivityText('update', task, context.changeData);

      if (activityText) {
        await createActivity({
          text: activityText,
          workspaceId: task.workspaceId,
          taskId: task.id,
        });
      }

      // You can now use activityText to create an Activity record if needed
      return { message: 'Handled schedule update', activityText };
    }

    // For delete
    await clearReminders(task);

    if (task.updatedBy === 'assistant') {
      return 'Deleted by assistant';
    }

    const activityText = getActivityText('delete', task);

    if (activityText) {
      await createActivity({
        text: activityText,
        workspaceId: task.workspaceId,
        taskId: task.id,
      });
    }

    // You can now use activityText to create an Activity record if needed
    return { message: 'Handled schedule delete', activityText };
  },
});
