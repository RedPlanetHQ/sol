import { Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';

@Injectable()
export default class AutomationService {
  constructor(private prisma: PrismaService) {}

  async createAutomation(
    text: string,
    mcps: string[],
    workspaceId: string,
    title?: string,
  ) {
    return await this.prisma.automation.create({
      data: {
        title: title || text.slice(0, 60),
        text,
        mcps,
        workspaceId,
      },
    });
  }

  async getAutomation(automationId: string, workspaceId: string) {
    return await this.prisma.automation.findFirst({
      where: {
        id: automationId,
        workspaceId,
        deleted: null,
      },
    });
  }

  async updateAutomation(
    automationId: string,
    text: string,
    mcps: string[],
    workspaceId: string,
    title?: string,
  ) {
    return await this.prisma.automation.update({
      where: {
        id: automationId,
        workspaceId,
      },
      data: {
        title: title || text.slice(0, 60),
        text,
        mcps,
      },
    });
  }

  async deleteAutomation(automationId: string, workspaceId: string) {
    await this.prisma.automation.update({
      where: {
        id: automationId,
        workspaceId,
      },
      data: {
        deleted: new Date(),
      },
    });
  }
}
