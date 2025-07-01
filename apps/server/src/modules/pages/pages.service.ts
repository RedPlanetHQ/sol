import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import {
  CreatePageDto,
  GetPageByTitleDto,
  OutlinkType,
  Outlink,
  PageSelect,
  UpdatePageDto,
  JsonObject,
  Task,
  CreateTaskDto,
  PageTypeEnum,
  PublicPage,
} from '@redplanethq/sol-sdk';
import {
  convertHtmlToTiptapJson,
  convertTiptapJsonToHtml,
} from '@sol/editor-extensions';
import { tasks } from '@trigger.dev/sdk/v3';
import { CohereClientV2 } from 'cohere-ai';
import { PrismaService } from 'nestjs-prisma';
import { pageActivityHandler } from 'triggers/page/page-activity-handler';

import { ContentService } from 'modules/content/content.service';
import { TransactionClient } from 'modules/tasks/tasks.utils';

import {
  dataChanged,
  findTextPosition,
  getOutlinksTaskId,
  getTaskItemContent,
  getTaskListsInPage,
  removeTasksFromPage,
  updateHtmlContent,
  UpdatePartialPageDto,
  updateTaskListsInPage,
  upsertTasksInPage,
} from './pages.utils';

@Injectable()
export class PagesService {
  constructor(
    private prisma: PrismaService,

    private contentService: ContentService,
    private configService: ConfigService,
  ) {}

  async getPageByTitle(
    workspaceId: string,
    getPageByTitleDto: GetPageByTitleDto,
  ): Promise<PublicPage> {
    const page = await this.prisma.page.findFirst({
      where: {
        title: getPageByTitleDto.title,
        type: getPageByTitleDto.type,
        workspaceId,
        deleted: null,
      },
      select: PageSelect,
    });

    if (page?.description) {
      const descriptionJson = JSON.parse(page.description);
      page.description = convertTiptapJsonToHtml(descriptionJson);
    }

    return page;
  }

  async getOrCreatePageByTitle(
    workspaceId: string,
    getPageByTitleDto: GetPageByTitleDto,
  ): Promise<PublicPage> {
    // Combine find and create into a single transaction if needed
    const { title, type, taskIds } = getPageByTitleDto;

    const page = await this.prisma.$transaction(async (tx) => {
      // Try to find existing page
      let page = await tx.page.findFirst({
        where: {
          title,
          type,
          workspaceId,
          deleted: null,
        },
        select: PageSelect,
      });

      if (!page) {
        // Create new page if not found
        page = await tx.page.create({
          data: {
            title,
            type,
            workspace: { connect: { id: workspaceId } },
            sortOrder: '',
            tags: [],
          },
          select: PageSelect,
        });
      }

      return page;
    });

    // Update task extensions if needed
    if (taskIds?.length > 0) {
      await this.upsertTasksInPageById(page.id, taskIds);
    }

    // Convert description to HTML if it exists
    if (page.description) {
      const descriptionJson = JSON.parse(page.description);
      page.description = convertTiptapJsonToHtml(descriptionJson);
    }

    return page;
  }

  async getPage(pageId: string): Promise<PublicPage> {
    const page = await this.prisma.page.findUnique({
      where: {
        id: pageId,
        deleted: null,
      },
      select: PageSelect,
    });

    if (page?.description) {
      const descriptionJson = JSON.parse(page.description);
      page.description = convertTiptapJsonToHtml(descriptionJson);
    }

    return page;
  }

  async createPage(
    { parentId, description, htmlDescription, ...pageData }: CreatePageDto,
    workspaceId: string,
  ): Promise<PublicPage> {
    let finalDescription = description;
    if (htmlDescription && !description) {
      finalDescription = JSON.stringify(
        convertHtmlToTiptapJson(htmlDescription),
      );
    }

    const page = await this.prisma.$transaction(async (tx) => {
      // Try to find existing page
      let page = await tx.page.findFirst({
        where: {
          title: pageData.title,
          type: pageData.type,
          workspaceId,
          deleted: null,
        },
        select: PageSelect,
      });

      if (!page) {
        page = await this.prisma.page.create({
          data: {
            ...pageData,
            description: finalDescription,
            workspace: { connect: { id: workspaceId } },
            ...(parentId && { parent: { connect: { id: parentId } } }),
          },
        });
      }

      return page;
    });

    if (page?.description) {
      const descriptionJson = JSON.parse(page.description);
      page.description = convertTiptapJsonToHtml(descriptionJson);
    }

    return page;
  }

  async updatePage(
    { parentId, description, htmlDescription, ...pageData }: UpdatePageDto,
    pageId: string,
    tx?: TransactionClient,
  ): Promise<PublicPage> {
    const prismaClient = tx || this.prisma;

    let finalDescription = description;
    if (htmlDescription && !description) {
      finalDescription = JSON.stringify(
        convertHtmlToTiptapJson(htmlDescription),
      );
    }

    // Update the page with new description in the same transaction
    if (finalDescription) {
      await this.contentService.updateContentForDocument(
        pageId,
        JSON.parse(finalDescription),
      );
    }

    const page = await prismaClient.page.update({
      where: { id: pageId },
      data: {
        ...pageData,
        ...(parentId && { parent: { connect: { id: parentId } } }),
      },
      select: PageSelect,
    });

    if (page?.description) {
      try {
        const descriptionJson = JSON.parse(page.description);
        page.description = convertTiptapJsonToHtml(descriptionJson);
      } catch (e) {}
    }

    return page;
  }

  async updatePartialPage(
    pageId: string,
    data: UpdatePartialPageDto,
  ): Promise<PublicPage> {
    // Get the current page
    const page = await this.prisma.page.findUnique({
      where: { id: pageId },
      select: { description: true, ...PageSelect },
    });

    if (!page?.description) {
      page.description = JSON.stringify({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [],
          },
        ],
      });
    }

    // Parse the current description JSON and convert to HTML
    const descriptionJson = JSON.parse(page.description);
    const currentHtml = convertTiptapJsonToHtml(descriptionJson);

    // If findText is provided, find its position in the HTML
    if (data.findText && data.startOffset === undefined) {
      const offset = findTextPosition(
        currentHtml,
        data.findText.text,
        data.findText.ignoreCase,
      );

      if (offset === -1) {
        throw new Error(
          `Text "${data.findText.text}" not found in page content`,
        );
      }

      data.startOffset = offset;

      // If it's a replace operation and no endOffset/length is provided,
      // set the length to the length of the found text
      if (data.endOffset === undefined && data.length === undefined) {
        data.length = data.findText.text.length;
      }
    }

    // Update the HTML content
    const updatedHtml = updateHtmlContent(currentHtml, data);

    // Update the page with the modified content
    return await this.updatePage({ htmlDescription: updatedHtml }, pageId);
  }

  async deletePage(pageId: string): Promise<PublicPage> {
    const page = await this.prisma.page.update({
      where: { id: pageId },
      data: {
        deleted: new Date(),
      },
      select: PageSelect,
    });
    if (page?.description) {
      const descriptionJson = JSON.parse(page.description);
      page.description = convertTiptapJsonToHtml(descriptionJson);
    }
    return page;
  }

  async removeTaskFromPageById(pageId: string, taskIds: string[]) {
    const page = await this.prisma.page.findUnique({
      where: { id: pageId, deleted: null },
    });

    // Remove specified tasks
    const pageDescription = removeTasksFromPage(page, taskIds);

    await this.contentService.updateContentForDocument(
      page.id,
      JSON.parse(pageDescription),
    );

    return page;
  }

  async upsertTasksInPageById(pageId: string, taskIds: string[]) {
    const page = await this.prisma.page.findUnique({ where: { id: pageId } });
    const tasks = await this.prisma.task.findMany({
      where: { id: { in: taskIds } },
      include: { page: true },
    });

    // Get existing task lists
    const taskLists = getTaskListsInPage(page);

    // Update task lists with new tasks
    const updatedTaskLists = upsertTasksInPage(taskLists, tasks);

    // Update the page description with the updated task lists
    const description = updateTaskListsInPage(page, updatedTaskLists);

    // Update the page with new description in the same transaction
    await this.contentService.updateContentForDocument(page.id, description);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async storeOutlinks(pageId: string) {
    const page = await this.prisma.page.findUnique({ where: { id: pageId } });
    let tiptapJson;

    try {
      tiptapJson = JSON.parse(page.description);
    } catch (e) {
      console.log(e);
      return null;
    }

    // Parse outlinks from string to JSON
    const pageOutlinks = page.outlinks ? page.outlinks : [];

    // Extract taskIds from current outlinks
    const currentTaskIds = getOutlinksTaskId(pageOutlinks);

    const outlinks: Outlink[] = [];
    const newOutlinkTaskIds: string[] = [];
    const allTaskIds = new Set<string>();

    // Single-pass traversal to collect outlinks and all task IDs
    const traverseDocument = (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      node: any,
      path: number[] = [],
    ) => {
      // If this is a task node, create an outlink
      if (node.type === 'taskItem' && node.attrs?.id) {
        // Add the outlink
        outlinks.push({
          type: OutlinkType.Task,
          id: node.attrs.id,
          position: {
            path: [...path],
          },
        });
        newOutlinkTaskIds.push(node.attrs.id);

        // Add all task IDs to the set regardless of location
        allTaskIds.add(node.attrs.id);
      }

      // Recursively process content
      if (node.content && Array.isArray(node.content)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        node.content.forEach((child: any, index: number) => {
          traverseDocument(child, [...path, index]);
        });
      }
    };

    // Process if content exists
    if (tiptapJson.content) {
      // Single pass traversal
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tiptapJson.content.forEach((node: any, index: number) => {
        traverseDocument(node, [index]);
      });
    }

    const taskIdsAreEqual =
      currentTaskIds.length === newOutlinkTaskIds.length &&
      currentTaskIds.every((id) => newOutlinkTaskIds.includes(id));

    if (!taskIdsAreEqual) {
      // Update the page with the new outlinks
      await this.prisma.page.update({
        where: { id: pageId },
        data: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          outlinks: outlinks as any,
        },
      });

      // Compare current task IDs with task extension task IDs
      const removedTaskIds = currentTaskIds.filter(
        (taskId) => !allTaskIds.has(taskId),
      );

      const addedTaskIds = Array.from(allTaskIds).filter(
        (taskId) => !currentTaskIds.includes(taskId),
      );

      if (page.type === 'List') {
        const list = await this.prisma.list.findFirst({
          where: { pageId: page.id, deleted: null },
        });

        if (addedTaskIds.length) {
          await this.prisma.task.updateMany({
            where: {
              id: { in: addedTaskIds },
              deleted: null,
            },
            data: {
              listId: list?.id,
            },
          });
        }

        if (removedTaskIds.length) {
          await this.prisma.task.updateMany({
            where: {
              id: { in: removedTaskIds },
              deleted: null,
              listId: list.id,
            },
            data: {
              listId: null,
            },
          });
        }
      } else if (page.type === 'Default') {
        const pageTask = await this.prisma.task.findFirst({
          where: { pageId: page.id, deleted: null },
        });
        if (addedTaskIds.length) {
          await this.prisma.task.updateMany({
            where: {
              id: { in: addedTaskIds },
              deleted: null,
            },
            data: {
              parentId: pageTask.id,
            },
          });
        }

        if (removedTaskIds.length) {
          await this.prisma.task.updateMany({
            where: {
              id: { in: removedTaskIds },
              deleted: null,
              parentId: pageTask.id,
            },
            data: {
              parentId: null,
            },
          });
        }
      }
    }

    return { outlinks, allTaskIds };
  }

  async createTask(
    createTaskDto: CreateTaskDto,
    workspaceId: string,
  ): Promise<Task> {
    const prismaClient = this.prisma;
    const {
      title,
      status: taskStatus,
      source,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      integrationAccountId,
      listId,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      pageDescription,
      parentId,
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
        },
        include: {
          page: true,
        },
      });

      return task;
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
      },
      include: {
        page: true,
      },
    });

    return task;
  }

  async createTasks(pageId: string) {
    const page = await this.prisma.page.findUnique({ where: { id: pageId } });
    let tiptapJson;

    try {
      tiptapJson = JSON.parse(page.description);
    } catch (e) {
      console.log(e);
      return null;
    }

    let tasksCreated = false;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const getTitle = (node: any) => {
      try {
        return node.content[0].content[0].text;
      } catch (e) {
        return '';
      }
    };

    // Single-pass traversal to collect outlinks and all task IDs
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const traverseDocument = async (node: any, path: number[] = []) => {
      // If this is a task node without an ID, create a task
      if (node.type === 'taskItem' && !node.attrs?.id) {
        const title = getTitle(node);

        if (title) {
          const task = await this.createTask(
            { title, status: 'Todo' },
            page.workspaceId,
          );
          // Add the task ID to the node attributes
          node.attrs = { ...node.attrs, id: task.id };
          tasksCreated = true;
        }
      }

      // Recursively process content
      if (node.content && Array.isArray(node.content)) {
        for (const child of node.content) {
          await traverseDocument(child, [...path]);
        }
      }
    };

    // Process if content exists
    if (tiptapJson.content) {
      // Process nodes sequentially to maintain order
      for (const node of tiptapJson.content) {
        await traverseDocument(node);
      }
    }

    // Update the page with the modified JSON that now includes task IDs
    // Only update the page if we actually created new tasks
    if (tasksCreated) {
      await this.contentService.updateContentForDocument(pageId, tiptapJson);
    }
    return tiptapJson;
  }

  async handleTitleChange(pageId: string, changeData: JsonObject) {
    const currentPage = await this.prisma.page.findUnique({
      where: { id: pageId },
      include: { task: true },
    });
    if (!currentPage.task.length) {
      return;
    }
    const taskId = currentPage.task[0].id;
    if (changeData && changeData.title) {
      const pagesWithTask = await this.prisma.page.findMany({
        where: {
          outlinks: {
            array_contains: [
              {
                type: OutlinkType.Task,
                id: taskId,
              },
            ],
          },
        },
        select: { id: true, description: true, outlinks: true },
      });

      await Promise.all(
        pagesWithTask.map(async (page) => {
          if (!page.description) {
            return;
          }

          try {
            const description = JSON.parse(page.description as string);
            const taskOutlinks = (page.outlinks as unknown as Outlink[]).filter(
              (o) => o.id === taskId && o.type === OutlinkType.Task,
            );

            let updated = false;
            for (const outlink of taskOutlinks) {
              let node = description;
              for (const index of outlink.position.path) {
                node = node.content[index];
              }

              node.content = getTaskItemContent(currentPage.title);

              updated = true;
            }

            if (updated) {
              await this.updatePage(
                { description: JSON.stringify(description) },
                page.id,
              );
            }
          } catch (error) {
            console.error(`Failed to update task in page ${page.id}:`, error);
          }
        }),
      );
    }
  }

  async handleHooks(payload: {
    pageId: string;
    changedData: JsonObject;
    action: 'create' | 'update' | 'delete';
  }) {
    const page = await this.prisma.page.findUnique({
      where: {
        id: payload.pageId,
      },
    });

    if (dataChanged(payload.changedData, 'description')) {
      const pageDescription = (
        payload.changedData.description as {
          oldValue: string;
          newValue: string;
        }
      ).newValue;

      if (pageDescription) {
        await this.createTasks(payload.pageId);
        await this.storeOutlinks(payload.pageId);
      }
    }

    if (dataChanged(payload.changedData, 'title')) {
      await this.handleTitleChange(payload.pageId, payload.changedData);
      await tasks.trigger<typeof pageActivityHandler>('page-activity-handler', {
        action: payload.action,
        page,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        changeData: payload.changedData as any,
      });
    }
  }

  async searchPages(query: string, workspaceId: string): Promise<PublicPage[]> {
    // Find pages that match the query string in title or description
    const whereClause: Prisma.PageWhereInput = {
      deleted: null,
      workspaceId,
      OR: [
        {
          title: {
            contains: query,
            mode: 'insensitive',
          },
        },
      ],
    };

    const pages = await this.prisma.page.findMany({
      where: whereClause,
      select: PageSelect,
      take: 10,
      orderBy: {
        updatedAt: 'desc',
      },
    });

    // Convert description to HTML for each page
    const pagesWithHtml = pages.map((page) => {
      if (page?.description) {
        try {
          const descriptionJson = JSON.parse(page.description as string);
          page.description = convertTiptapJsonToHtml(descriptionJson);
        } catch (error) {
          console.error(
            `Failed to parse description for page ${page.id}:`,
            error,
          );
        }
      }
      return page;
    });

    const cohereApiKey = this.configService.get<string>('COHERE_API_KEY');
    let cohereClient: CohereClientV2 | null = null;
    if (cohereApiKey) {
      cohereClient = new CohereClientV2({
        token: cohereApiKey,
      });
    }

    // If no pages found or Cohere client not initialized, return pages
    if (pagesWithHtml.length === 0 || !cohereClient) {
      return pagesWithHtml.slice(0, 3);
    }

    try {
      // Extract page titles for reranking
      const documents = pagesWithHtml.map((page) => page.title || '');

      // Call Cohere rerank API
      const rerankedResults = await cohereClient.rerank({
        query,
        documents,
        model: 'rerank-v3.5',
        topN: 3,
      });

      // Sort pages based on reranking results
      const rerankedPages = rerankedResults.results.map((result) => {
        return pagesWithHtml[result.index];
      });

      return rerankedPages;
    } catch (error) {
      // If reranking fails, fall back to returning the original results
      console.error('Cohere reranking failed:', error);
      return pagesWithHtml.slice(0, 3);
    }
  }
}
