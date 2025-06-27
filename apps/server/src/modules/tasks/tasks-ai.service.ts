import { Injectable } from '@nestjs/common';
import {
  AgentWorklogStateEnum,
  LLMMappings,
  ReccurenceInput,
  recurrencePrompt,
} from '@redplanethq/sol-sdk';
import { addMinutes, endOfDay, startOfDay } from 'date-fns';
import { PrismaService } from 'nestjs-prisma';
import { generate } from 'triggers/agents/chat/stream-utils';

import { LoggerService } from 'modules/logger/logger.service';
import { TaskOccurenceService } from 'modules/task-occurrence/task-occurrence.service';

@Injectable()
export default class TasksAIService {
  private readonly logger: LoggerService = new LoggerService('TasksAIService');

  constructor(
    private prisma: PrismaService,
    private taskOccurrence: TaskOccurenceService,
  ) {}

  async schedule(recurrenceInput: ReccurenceInput, workspaceId: string) {
    const agentWorklog = await this.prisma.agentWorklog.create({
      data: {
        modelId: recurrenceInput.taskIds[0],
        modelName: 'Task',
        state: AgentWorklogStateEnum.Thinking,
        type: 'Schedule',
        workspaceId,
      },
    });

    const data = await this.recurrence(recurrenceInput);

    await this.prisma.taskOccurrence.updateMany({
      where: {
        taskId: {
          in: recurrenceInput.taskIds,
        },
      },
      data: {
        deleted: new Date(),
      },
    });

    if (data.startTime && !data.recurrenceRule[0]) {
      await this.taskOccurrence.createTaskOccurence(
        {
          taskIds: recurrenceInput.taskIds,
          startTime: startOfDay(data.startTime).toISOString(),
          endTime: addMinutes(data.startTime, 15).toISOString(),
        },
        workspaceId,
      );
    }

    await this.prisma.task.updateMany({
      where: {
        id: {
          in: recurrenceInput.taskIds,
        },
      },
      data: {
        status: 'Todo',
        recurrence: data.recurrenceRule ? data.recurrenceRule : [],
        scheduleText:
          data.recurrenceRule && data.recurrenceRule.length > 0
            ? data.scheduleText
            : null,
        startTime: data.startTime ? data.startTime : null,
        endTime: data.endTime
          ? data.endTime
          : addMinutes(data.startTime, 15).toISOString(),
      },
    });

    await this.prisma.agentWorklog.update({
      where: {
        id: agentWorklog.id,
      },
      data: {
        state: AgentWorklogStateEnum.Done,
      },
    });
  }

  async recurrence(reccurenceInput: ReccurenceInput) {
    let recurrenceOutput = '';

    const gen = generate(
      [
        {
          role: 'user',
          content: recurrencePrompt
            .replace('{{text}}', reccurenceInput.text)
            .replace('{{currentTime}}', reccurenceInput.currentTime),
        },
      ],
      false,
      () => {},
      undefined,
      '',
      LLMMappings.CLAUDESONNET,
    );

    for await (const chunk of gen) {
      if (typeof chunk === 'string') {
        recurrenceOutput += chunk;
      } else if (chunk && typeof chunk === 'object' && chunk.message) {
        recurrenceOutput += chunk.message;
      }
    }

    const outputMatch = recurrenceOutput.match(/<output>(.*?)<\/output>/s);

    if (!outputMatch) {
      this.logger.error({
        message: 'No output found in recurrence response',
        where: `TasksAIService.recurrence`,
      });
      throw new Error('Invalid response format from AI');
    }

    try {
      const jsonStr = outputMatch[1].trim();
      const parsedOutput = JSON.parse(jsonStr);
      return parsedOutput;
    } catch (error) {
      this.logger.error({
        message: 'Failed to parse recurrence JSON output',
        payload: error,
        where: `TasksAIService.recurrence`,
      });
      throw new Error('Invalid JSON in AI response');
    }
  }

  async duedate(recurrenceInput: ReccurenceInput, workspaceId: string) {
    const agentWorklog = await this.prisma.agentWorklog.create({
      data: {
        modelId: recurrenceInput.taskIds[0],
        modelName: 'Task',
        state: AgentWorklogStateEnum.Thinking,
        type: 'DueDate',
        workspaceId,
      },
    });

    const data = await this.recurrence(recurrenceInput);

    if (data.dueDate) {
      await this.prisma.task.updateMany({
        where: {
          id: {
            in: recurrenceInput.taskIds,
          },
        },
        data: {
          status: 'Todo',
          dueDate: data.dueDate,
        },
      });
    }

    if (data.startTime) {
      await this.prisma.task.updateMany({
        where: {
          id: {
            in: recurrenceInput.taskIds,
          },
        },
        data: {
          status: 'Todo',
          dueDate: endOfDay(data.startTime),
        },
      });
    }

    await this.prisma.agentWorklog.update({
      where: {
        id: agentWorklog.id,
      },
      data: {
        state: AgentWorklogStateEnum.Done,
      },
    });
  }
}
