import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  List,
  PageSelect,
  PageTypeEnum,
  Task,
  UpdateListDto,
} from '@redplanethq/sol-sdk';
import { convertTiptapJsonToHtml } from '@sol/editor-extensions';
import { PrismaService } from 'nestjs-prisma';

import { PagesService } from 'modules/pages/pages.service';

@Injectable()
export class ListsService {
  constructor(
    private prisma: PrismaService,
    private page: PagesService,
  ) {}

  async createList(
    workspaceId: string,
    updatedBy: string = 'user',
    title?: string,
    favourite?: boolean,
    htmlDescription?: string,
  ) {
    const list = await this.prisma.list.create({
      data: {
        workspace: { connect: { id: workspaceId } },
        favourite,
        updatedBy,
        page: {
          create: {
            sortOrder: '',
            tags: [],
            type: PageTypeEnum.List,
            workspace: { connect: { id: workspaceId } },
            ...(title ? { title } : {}),
          },
        },
      },
      include: {
        page: { select: PageSelect },
      },
    });

    if (htmlDescription) {
      await this.page.updatePage(
        {
          htmlDescription,
        },
        list.pageId,
      );

      list.page.description = htmlDescription;
    }

    return list;
  }

  async getList(listId: string) {
    const list = await this.prisma.list.findUnique({
      where: {
        id: listId,
        deleted: null,
      },
      include: {
        page: { select: PageSelect },
      },
    });

    if (!list) {
      throw new NotFoundException(`List with ID ${listId} not found`);
    }

    if (list.page?.description) {
      const descriptionJson = JSON.parse(list.page.description);
      list.page.description = convertTiptapJsonToHtml(descriptionJson);
    }

    return list;
  }

  async updateList(
    listId: string,
    updateListDto: UpdateListDto,
    updatedBy: string = 'user',
  ) {
    const { htmlDescription, ...rest } = updateListDto;
    const list = await this.prisma.list.update({
      where: {
        id: listId,
      },
      data: { ...rest, updatedBy },
      include: {
        page: true,
      },
    });

    if (htmlDescription) {
      const page = await this.page.updatePage(
        {
          htmlDescription,
        },
        list.pageId,
      );
      list.page.description = page.description;
    }

    return list;
  }

  async deleteList(listId: string, updatedBy: string = 'user') {
    // First check if the list exists
    const list = await this.prisma.list.findUnique({
      where: {
        id: listId,
        deleted: null,
      },
    });

    if (!list) {
      throw new NotFoundException(`List with ID ${listId} not found`);
    }

    // Check if there are any tasks associated with this list
    const tasksCount = await this.prisma.task.count({
      where: {
        listId,
        deleted: null,
      },
    });

    if (tasksCount > 0) {
      throw new BadRequestException(
        `Cannot delete list with ID ${listId} because it has ${tasksCount} associated tasks`,
      );
    }

    // If no tasks are associated, proceed with the soft delete
    return await this.prisma.list.update({
      where: {
        id: listId,
      },
      data: {
        deleted: new Date().toISOString(),
        updatedBy,
      },
    });
  }

  async getAllLists(
    workspaceId: string,
    page: number,
    size: number,
  ): Promise<List[]> {
    const skip = (page - 1) * size;
    return await this.prisma.list.findMany({
      where: { deleted: null, workspaceId },
      include: {
        page: { select: { id: true, title: true } },
      },
      skip,
      take: size,
    });
  }

  async getListTasks(listId: string): Promise<Task[]> {
    return await this.prisma.task.findMany({
      where: { listId, deleted: null },
    });
  }
}
