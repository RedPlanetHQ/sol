import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import {
  CreateTaskDto,
  JsonObject,
  PageSelect,
  PageTypeEnum,
  Task,
  UpdateTaskDto,
} from '@redplanethq/sol-sdk';
import { convertTiptapJsonToHtml } from '@sol/editor-extensions';
import { CohereClientV2 } from 'cohere-ai';
import { PrismaService } from 'nestjs-prisma';

import { IntegrationsService } from 'modules/integrations/integrations.service';
import { PagesService } from 'modules/pages/pages.service';
import { TaskOccurenceService } from 'modules/task-occurrence/task-occurrence.service';

import { handleCalendarTask, TransactionClient } from './tasks.utils';

@Injectable()
export class TasksService {
  constructor(
    private prisma: PrismaService,
    private taskOccurenceService: TaskOccurenceService,
    private integrationService: IntegrationsService,
    private pageService: PagesService,
    private configService: ConfigService,
  ) {}

  async getTaskBySourceURL(
    sourceURL: string,
    workspaceId: string,
  ): Promise<Task | null> {
    const task = await this.prisma.task.findFirst({
      where: {
        source: {
          path: ['type'],
          equals: 'external',
        },
        AND: {
          source: {
            path: ['url'],
            equals: sourceURL,
          },
        },
        deleted: null,
        workspaceId,
      },
    });

    return task || null;
  }

  async getTaskById(taskId: string) {
    const task = await this.prisma.task.findUnique({
      where: {
        id: taskId,
        deleted: null,
      },
      include: {
        page: { select: PageSelect },
      },
    });

    if (task.page.description) {
      task.page.description = convertTiptapJsonToHtml(
        JSON.parse(task.page.description),
      );
    }
    return task;
  }

  async upsertTaskBySource(
    createTaskDto: CreateTaskDto,
    workspaceId: string,
    tx?: TransactionClient,
  ) {
    const { source, integrationAccountId } = createTaskDto;

    if (!source || !integrationAccountId) {
      throw new BadRequestException(
        'source and integrationAccountId are required for upsert',
      );
    }

    const externalTask = await this.getTaskBySourceURL(source.url, workspaceId);

    // If we found a task, update it
    if (externalTask) {
      return await this.updateTask(externalTask.id, createTaskDto, 'user', tx);
    }

    // If no existing task found, create a new one
    return await this.createTask(createTaskDto, workspaceId, 'user', tx);
  }

  async createTask(
    createTaskDto: CreateTaskDto,
    workspaceId: string,
    updatedBy: string = 'user',
    tx?: TransactionClient,
  ) {
    const prismaClient = tx || this.prisma;
    const {
      title,
      status: taskStatus,
      source,
      integrationAccountId,
      listId,
      pageDescription,
      parentId,
      startTime,
      endTime,
      ...otherTaskData
    } = createTaskDto;

    // For a page if there exisiting an already deleted task with the same title
    // use that instead of creating a new one
    const exisitingTask = await prismaClient.task.findMany({
      where: {
        deleted: { not: null },
        page: {
          title,
        },
      },
    });

    if (exisitingTask.length > 0 && exisitingTask[0]) {
      const task = await prismaClient.task.update({
        where: {
          id: exisitingTask[0].id,
        },
        data: {
          deleted: null,
          source: source ? { ...source } : undefined,
          updatedBy,
        },
        include: {
          page: { select: PageSelect },
        },
      });

      if (pageDescription) {
        await this.pageService.updatePage(
          { htmlDescription: pageDescription },
          task.pageId,
          tx,
        );
        task.page.description = pageDescription;
      }

      return task;
    }

    // If there is startTime and no endTime, set endTime to 15 minutes after startTime
    let computedEndTime = endTime;
    if (startTime && !endTime) {
      const start = new Date(startTime);
      start.setMinutes(start.getMinutes() + 15);
      computedEndTime = start.toISOString();
    }

    // Create the task first
    const task = await prismaClient.task.create({
      data: {
        status: taskStatus || 'Todo',
        ...otherTaskData,
        workspace: { connect: { id: workspaceId } },
        ...(listId && {
          list: { connect: { id: listId } },
        }),
        updatedBy,
        ...(parentId && { parent: { connect: { id: parentId } } }),
        page: {
          create: {
            title,
            sortOrder: '',
            tags: [],
            type: PageTypeEnum.Default,
            workspace: { connect: { id: workspaceId } },
          },
        },
        source: source ? { ...source } : undefined,
        ...(integrationAccountId && {
          integrationAccount: { connect: { id: integrationAccountId } },
        }),
        ...(startTime && { startTime }),
        ...(computedEndTime && { endTime: computedEndTime }),
      },
      include: {
        page: true,
      },
    });

    if (pageDescription) {
      await this.pageService.updatePage(
        { htmlDescription: pageDescription },
        task.pageId,
        tx,
      );
    }

    return task;
  }

  async updateTask(
    taskId: string,
    updateTaskDto: UpdateTaskDto,
    updatedBy: string = 'user',
    tx?: TransactionClient,
  ) {
    const prismaClient = tx || this.prisma;
    const {
      title,
      status: taskStatus,
      source,
      listId,
      pageDescription,
      ...otherTaskData
    } = updateTaskDto;

    // Build update data object
    const updateData: JsonObject = {
      ...otherTaskData,
      ...(source && { source: { url: source.url, type: source.type } }),
      ...(taskStatus && {
        status: taskStatus,
        ...(taskStatus === 'Done' || taskStatus === 'Canceled'
          ? { completedAt: new Date() }
          : {}),
      }),
      ...(title && {
        page: {
          update: { title },
        },
      }),
      ...(listId && {
        list: { connect: { id: listId } },
      }),
      ...('recurrence' in updateTaskDto && {
        recurrence: updateTaskDto.recurrence || [],
      }),
      updatedBy,
    };

    // Get existing task and update in a single transaction
    const updatedTask = await prismaClient.task.update({
      where: { id: taskId },
      data: updateData,
      include: {
        page: { select: PageSelect },
      },
    });

    if (pageDescription) {
      await this.pageService.updatePage(
        { htmlDescription: pageDescription },
        updatedTask.pageId,
        tx,
      );

      updatedTask.page.description = pageDescription;
    }

    return updatedTask;
  }

  async deleteTask(taskId: string, updatedBy: string) {
    // Get task and update in a single transaction
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: { page: { select: PageSelect } },
    });

    if (!task) {
      throw new Error('Task not found');
    }

    if (task.page.description) {
      task.page.description = convertTiptapJsonToHtml(
        JSON.parse(task.page.description),
      );
    }

    if (task.deleted) {
      return task;
    }

    // Soft delete the task
    return await this.prisma.task.update({
      where: { id: taskId },
      data: {
        deleted: new Date().toISOString(),
        recurrence: [],
        scheduleText: null,
        startTime: null,
        endTime: null,
        updatedBy,
      },
    });
  }

  async deleteTaskBySourceURL(
    sourceURL: string,
    workspaceId: string,
    userId: string,
  ) {
    return await this.prisma.$transaction(async (tx: TransactionClient) => {
      const task = await this.getTaskBySourceURL(sourceURL, workspaceId);
      if (!task || task.deleted) {
        return task;
      }

      // Run these operations in parallel since they're independent
      await Promise.all([
        // Delete task occurrences if it's recurring
        task.recurrence &&
          this.taskOccurenceService.deleteTaskOccurenceByTask(
            task.id,
            workspaceId,
          ),

        // Update calendar if task has dates
        (task.startTime || task.endTime) &&
          handleCalendarTask(
            this.prisma,
            this.integrationService,
            workspaceId,
            userId,
            'delete',
            task,
          ),
      ]);

      return await tx.task.update({
        where: { id: task.id },
        data: {
          deleted: new Date().toISOString(),
        },
      });
    });
  }

  async searchTasks(query: string, workspaceId: string) {
    // First, get all tasks that match the query string
    const whereClause: Prisma.TaskWhereInput = {
      deleted: null,
      workspaceId,
      page: {
        title: {
          contains: query,
          mode: 'insensitive',
        },
      },
    };

    const tasks = await this.prisma.task.findMany({
      where: whereClause,
      include: {
        page: { select: PageSelect },
      },
      take: 10,
    });

    const cohereApiKey = this.configService.get<string>('COHERE_API_KEY');
    let cohereClient: CohereClientV2 | null = null;
    if (cohereApiKey) {
      cohereClient = new CohereClientV2({
        token: cohereApiKey,
      });
    }

    // If no tasks found or Cohere client not initialized, return tasks
    if (tasks.length === 0 || !cohereClient) {
      return tasks.slice(0, 3);
    }

    try {
      // Extract task titles for reranking
      const documents = tasks.map((task) => task.page?.title || '');

      // Call Cohere rerank API
      const rerankedResults = await cohereClient.rerank({
        query,
        documents,
        model: 'rerank-v3.5',
        topN: 3,
      });

      // Sort tasks based on reranking results
      const rerankedTasks = rerankedResults.results.map((result) => {
        return tasks[result.index];
      });

      return rerankedTasks;
    } catch (error) {
      // If reranking fails, fall back to sorting by updatedAt
      console.error('Cohere reranking failed:', error);
      return tasks.slice(0, 3);
    }
  }
}
