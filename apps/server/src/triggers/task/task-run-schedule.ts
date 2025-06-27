import { PrismaClient } from '@prisma/client';
import { schedules } from '@trigger.dev/sdk/v3';
import { RRule } from 'rrule';
import { createActivity } from 'triggers/utils';

const prisma = new PrismaClient();

export const taskRunSchedule = schedules.task({
  id: 'task-run-schedule',
  run: async (data) => {
    const taskId = data.externalId;

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        page: true,
      },
    });

    const timestamp = data.timestamp;

    if (!task) {
      throw new Error(`Task with id ${taskId} not found`);
    }

    if (task.recurrence && task.recurrence.length > 0) {
      // Parse the recurrence rule
      const rule = RRule.fromString(task.recurrence[0]);

      // Get date range 10 days before and after timestamp
      const startDate = new Date(timestamp);
      startDate.setDate(startDate.getDate() - 10);

      const endDate = new Date(timestamp);
      endDate.setDate(endDate.getDate() + 10);

      // Get occurrences within the date range
      const occurrences = rule.between(startDate, endDate);

      // Check if timestamp matches any occurrence
      const timestampDate = timestamp;
      const isOccurrence = occurrences.some(
        (date) =>
          date.getFullYear() === timestampDate.getFullYear() &&
          date.getMonth() === timestampDate.getMonth() &&
          date.getDate() === timestampDate.getDate(),
      );

      if (!isOccurrence) {
        return 'No occurrence found for today';
      }
    }

    // Delete this schedule once it ran
    if (task.recurrence && task.recurrence.length === 0) {
      // Check if timestamp matches 15 minutes before task start time
      const taskStartTime = new Date(task.startTime);
      const reminderTime = new Date(taskStartTime.getTime() - 15 * 60 * 1000);

      if (timestamp.getTime() !== reminderTime.getTime()) {
        return 'Not time for reminder yet';
      }
    }

    const title = task.page?.title || 'Untitled';
    const text = `Reminder: Task "${title}" (${task.id}) is starting soon in 15 minutes.`;

    await createActivity({
      taskId,
      text,
      workspaceId: task.workspaceId,
    });

    // Delete this schedule once it ran for non-recurring tasks
    if (!task.recurrence || task.recurrence.length === 0) {
      await schedules.del(data.scheduleId);
    }

    return 'Added activity regarding the task';
  },
});
