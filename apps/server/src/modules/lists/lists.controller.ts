import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { List, UpdateListDto, ListIdDto, Task } from '@redplanethq/sol-sdk';

import { AuthGuard } from 'modules/auth/auth.guard';
import { UpdatedBy, Workspace } from 'modules/auth/session.decorator';

import { ListsService } from './lists.service';

@Controller({
  version: '1',
  path: 'lists',
})
export class ListsController {
  constructor(private lists: ListsService) {}

  @Post()
  @UseGuards(AuthGuard)
  async createList(
    @Workspace() workspaceId: string,
    @UpdatedBy() updatedBy: string,
    @Body('title') title?: string,
    @Body('favourite') favourite?: boolean,
    @Body('htmlDescription') htmlDescription?: string,
  ): Promise<List> {
    return await this.lists.createList(
      workspaceId,
      updatedBy,
      title,
      favourite,
      htmlDescription,
    );
  }

  @Post(':listId')
  @UseGuards(AuthGuard)
  async updateList(
    @Param() listIdDto: ListIdDto,
    @Body() updateListDto: UpdateListDto,
    @UpdatedBy() updatedBy: string,
  ): Promise<List> {
    return await this.lists.updateList(
      listIdDto.listId,
      updateListDto,
      updatedBy,
    );
  }

  @Delete(':listId')
  @UseGuards(AuthGuard)
  async deleteList(
    @Param() listIdDto: ListIdDto,
    @UpdatedBy() updatedBy: string,
  ): Promise<List> {
    return await this.lists.deleteList(listIdDto.listId, updatedBy);
  }

  @Get()
  @UseGuards(AuthGuard)
  async getAllLists(
    @Query('page') page: string,
    @Query('size') size: string,
    @Workspace() workspaceId: string,
  ): Promise<List[]> {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const sizeNum = Math.max(1, parseInt(size, 10) || 100);
    return await this.lists.getAllLists(workspaceId, pageNum, sizeNum);
  }

  @Get(':listId/tasks')
  @UseGuards(AuthGuard)
  async getListTasks(@Param() listIdDto: ListIdDto): Promise<Task[]> {
    return await this.lists.getListTasks(listIdDto.listId);
  }

  @Get(':listId')
  @UseGuards(AuthGuard)
  async getList(@Param() listIdDto: ListIdDto): Promise<List> {
    return await this.lists.getList(listIdDto.listId);
  }
}
