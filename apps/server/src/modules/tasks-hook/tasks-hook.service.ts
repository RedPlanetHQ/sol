import { Injectable } from '@nestjs/common';
import {
  PageTypeEnum,
  Task,
  TaskHookAction,
  TaskHookContext,
} from '@redplanethq/sol-sdk';
import { tasks } from '@trigger.dev/sdk/v3';
import { endOfDay, subDays } from 'date-fns';
import { PrismaService } from 'nestjs-prisma';
import { beautifyTask } from 'triggers/task/beautify-task';
import { taskActivityHandler } from 'triggers/task/task-activity-handler';

import { IntegrationsService } from 'modules/integrations/integrations.service';
import { PagesService } from 'modules/pages/pages.service';
import { TaskOccurenceService } from 'modules/task-occurrence/task-occurrence.service';
import { TaskVectorService } from 'modules/tasks/tasks-vector.service';
import { UsersService } from 'modules/users/users.service';

import { handleCalendarTask } from '../tasks/tasks.utils';

@Injectable()
export class TaskHooksService {
  constructor(
    private usersService: UsersService,
    private pagesService: PagesService,
    private prisma: PrismaService,
    private taskOccurenceService: TaskOccurenceService,
    private integrationService: IntegrationsService,
    private taskVectorService: TaskVectorService,
  ) {}

  async executeHookWithId(
    taskId: string,
    action: TaskHookAction,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    changeData?: Record<string, { oldValue: any; newValue: any }>,
  ) {
    const task = await this.prisma.task.findUnique({
      where: {
        id: taskId,
      },
      include: {
        workspace: true,
        subIssue: true,
        page: true,
      },
    });

    if (!task) {
      return;
    }

    const context: TaskHookContext = {
      userId: task.workspace.userId,
      workspaceId: task.workspaceId,
      action,
      changeData,
    };

    await this.handleBeautifyTask(task, context);
    await Promise.all([
      this.handleDeleteTask(task, context),
      this.handleScheduleTask(task, context),
      this.handleListTask(task, context),
      this.handleParentPageTask(task, context),
      this.handleTaskVector(task, context),
      tasks.trigger<typeof taskActivityHandler>('task-activity-handler', {
        task,
        context,
      }),
      // this.handleCalendarTask(task, context),
    ]);
  }

  async handleDeleteTask(task: Task, context: TaskHookContext) {
    if (context.action === 'delete') {
      const taskOccurences = await this.prisma.taskOccurrence.findMany({
        where: { taskId: task.id },
      });

      if (taskOccurences.length) {
        await this.prisma.taskOccurrence.updateMany({
          where: { taskId: task.id },
          data: { deleted: new Date().toISOString() },
        });
      }

      if (task.subIssue.length > 0) {
        await this.prisma.task.updateMany({
          where: { id: { in: task.subIssue.map((subTask) => subTask.id) } },
          data: { parentId: null },
        });
      }
    }
  }

  async handleScheduleTask(task: Task, context: TaskHookContext) {
    switch (context.action) {
      case 'create':
        if (task.recurrence) {
          await this.taskOccurenceService.createTaskOccurenceByTask(
            task.id,
            task.workspaceId,
          );
        }
        return { message: 'Handled schedule create' };

      case 'update':
        if (
          context.changeData &&
          (context.changeData.recurrence?.newValue ||
            context.changeData.startTime?.newValue ||
            context.changeData.endTime?.newValue)
        ) {
          await this.taskOccurenceService.updateTaskOccurenceByTask(
            task.id,
            task.workspaceId,
          );
        }
        return { message: 'Handled schedule update' };

      case 'delete':
        if (task.recurrence || task.startTime || task.endTime) {
          const yesterday = endOfDay(subDays(new Date(), 1));

          await this.prisma.taskOccurrence.updateMany({
            where: {
              taskId: task.id,
              startTime: {
                gte: yesterday,
              },
            },
            data: { deleted: new Date().toISOString() },
          });
        }
        return { message: 'Handled schedule delete' };
    }
  }

  async handleCalendarTask(task: Task, context: TaskHookContext) {
    switch (context.action) {
      case 'create':
        if (task.startTime || task.endTime) {
          await handleCalendarTask(
            this.prisma,
            this.integrationService,
            task.workspaceId,
            context.userId,
            'create',
            task,
          );
        }
        return { message: 'Handled schedule create' };

      case 'update':
        // Check if schedule related fields were updated
        if (
          context.changeData &&
          (context.changeData.recurrence?.newValue ||
            context.changeData.startTime?.newValue ||
            context.changeData.endTime?.newValue)
        ) {
          await handleCalendarTask(
            this.prisma,
            this.integrationService,
            task.workspaceId,
            context.userId,
            'update',
            task,
          );
        }
        return { message: 'Handled schedule update' };

      case 'delete':
        if (task.startTime || task.endTime) {
          await handleCalendarTask(
            this.prisma,
            this.integrationService,
            task.workspaceId,
            context.userId,
            'delete',
            task,
          );
        }
        return { message: 'Handled schedule delete' };
    }
  }

  async handleBeautifyTask(task: Task, context: TaskHookContext) {
    const callBeautify = () => {
      if (context.action === 'create') {
        return true;
      }

      if (context.action === 'update' && context.changeData.title) {
        return true;
      }

      return false;
    };

    if (callBeautify()) {
      const apiKey = await this.usersService.getOrCreateApiKey(context.userId);
      await tasks.trigger<typeof beautifyTask>('beautify-task', {
        taskId: task.id,
        pat: apiKey,
      });
    }
  }

  async handleListTask(task: Task, context: TaskHookContext) {
    if (task.updatedBy === 'assistant') {
      return { message: 'Handled list update by assistant' };
    }
    const addTaskToListPage = async (task: Task) => {
      const list = await this.prisma.list.findUnique({
        where: {
          id: task.listId,
        },
        include: {
          page: true,
        },
      });

      await this.pagesService.getOrCreatePageByTitle(task.workspaceId, {
        title: list.page.title,
        type: list.page.type as PageTypeEnum,
        taskIds: [task.id],
      });
    };

    const removeTaskInListPage = async (task: Task) => {
      const list = await this.prisma.list.findUnique({
        where: {
          id: task.listId,
        },
        include: {
          page: true,
        },
      });

      await this.pagesService.removeTaskFromPageById(list.page.id, [task.id]);
    };

    switch (context.action) {
      case 'create':
        if (task.listId) {
          await addTaskToListPage(task);
        }
        return { message: 'Handled schedule create' };

      case 'update':
        // Check if list ID was updated
        if (context.changeData.listId?.oldValue !== undefined) {
          // We need to temporarily modify the task to point to the old list
          const oldTask = {
            ...task,
            listId: context.changeData.listId.oldValue,
          };
          await removeTaskInListPage(oldTask);
        }

        if (context.changeData.listId?.newValue !== undefined) {
          await addTaskToListPage(task);
        }

        return { message: 'Handled list update' };

      case 'delete':
        if (task.listId) {
          await removeTaskInListPage(task);
        }
        return { message: 'Handled list delete' };
    }
  }

  async handleParentPageTask(task: Task, context: TaskHookContext) {
    if (task.updatedBy === 'assistant') {
      return { message: 'Handled parent page update by assistant' };
    }
    const addTaskToParentPage = async (task: Task, parentId: string) => {
      const parentTask = await this.prisma.task.findUnique({
        where: {
          id: parentId,
        },
        include: {
          page: true,
        },
      });

      if (parentTask && parentTask.page) {
        await this.pagesService.getOrCreatePageByTitle(task.workspaceId, {
          title: parentTask.page.title,
          type: parentTask.page.type as PageTypeEnum,
          taskIds: [task.id],
        });
      }
    };

    const removeTaskFromParentPage = async (task: Task, parentId: string) => {
      const parentTask = await this.prisma.task.findUnique({
        where: {
          id: parentId,
        },
        include: {
          page: true,
        },
      });

      if (parentTask && parentTask.page) {
        await this.pagesService.removeTaskFromPageById(parentTask.page.id, [
          task.id,
        ]);
      }
    };

    switch (context.action) {
      case 'create':
        if (task.parentId) {
          await addTaskToParentPage(task, task.parentId);
        }
        return { message: 'Handled parent page task create' };

      case 'update':
        // Check if parent ID was updated
        if (context.changeData.parentId?.oldValue !== undefined) {
          // We need to temporarily modify the task to point to the old parent
          const oldTask = {
            ...task,
            parentId: context.changeData.parentId.oldValue,
          };
          await removeTaskFromParentPage(
            oldTask,
            context.changeData.parentId.oldValue,
          );
        }

        if (context.changeData.parentId?.newValue !== undefined) {
          await addTaskToParentPage(task, context.changeData.parentId.newValue);
        }
        return { message: 'Handled parent page task update' };

      case 'delete':
        if (task.parentId) {
          await removeTaskFromParentPage(task, task.parentId);
        }

        return { message: 'Handled parent page task delete' };
    }
  }

  async handleTaskVector(task: Task, context: TaskHookContext) {
    switch (context.action) {
      case 'create':
      case 'update':
        await this.taskVectorService.indexTask(task.id);
        return { message: 'Upsert task vector' };

      case 'delete':
        await this.taskVectorService.deleteTaskIndex(task.id);
        return { message: 'task vector is deleted' };
    }
  }
}
