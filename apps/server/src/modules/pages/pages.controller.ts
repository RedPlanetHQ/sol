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
import {
  CreatePageDto,
  GetPageByTitleDto,
  PublicPage,
  PageRequestParamsDto,
  UpdatePageDto,
} from '@redplanethq/sol-sdk';

import { AuthGuard } from 'modules/auth/auth.guard';
import { Workspace } from 'modules/auth/session.decorator';

import { PagesService } from './pages.service';
import { UpdatePartialPageDto } from './pages.utils';

@Controller({
  version: '1',
  path: 'pages',
})
export class PagesController {
  constructor(private pagesService: PagesService) {}

  @Get('search')
  @UseGuards(AuthGuard)
  async searchPages(
    @Query('query') query: string,
    @Workspace() workspaceId: string,
  ): Promise<PublicPage[]> {
    return await this.pagesService.searchPages(query, workspaceId);
  }

  @Get(':pageId')
  @UseGuards(AuthGuard)
  async getPage(
    @Param() pageParams: PageRequestParamsDto,
  ): Promise<PublicPage> {
    return await this.pagesService.getPage(pageParams.pageId);
  }

  @Post('get-create')
  @UseGuards(AuthGuard)
  async getPageByTitle(
    @Workspace() workspaceId: string,
    @Body() getPageByTitleDto: GetPageByTitleDto,
  ): Promise<PublicPage> {
    return await this.pagesService.getOrCreatePageByTitle(
      workspaceId,
      getPageByTitleDto,
    );
  }

  @Post()
  @UseGuards(AuthGuard)
  async createPage(
    @Workspace() workspaceId: string,
    @Body() pageData: CreatePageDto,
  ): Promise<PublicPage> {
    return await this.pagesService.createPage(pageData, workspaceId);
  }

  @Post(':pageId')
  @UseGuards(AuthGuard)
  async updatePage(
    @Param() pageParams: PageRequestParamsDto,
    @Body() pageData: UpdatePageDto,
  ): Promise<PublicPage> {
    return await this.pagesService.updatePage(pageData, pageParams.pageId);
  }

  @Post(':pageId/partial')
  @UseGuards(AuthGuard)
  async updatePartialPage(
    @Param() pageParams: PageRequestParamsDto,
    @Body() pageData: UpdatePartialPageDto,
  ): Promise<PublicPage> {
    return await this.pagesService.updatePartialPage(
      pageParams.pageId,
      pageData,
    );
  }

  @Delete(':pageId')
  @UseGuards(AuthGuard)
  async deletePage(
    @Param() pageParams: PageRequestParamsDto,
  ): Promise<PublicPage> {
    return await this.pagesService.deletePage(pageParams.pageId);
  }
}
