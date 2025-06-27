import { PrismaClient } from '@prisma/client';
import {
  AgentWorklogStateEnum,
  beautifyPrompt,
  LLMMappings,
  ModelNameEnum,
  Preferences,
} from '@redplanethq/sol-sdk';
import { logger, task } from '@trigger.dev/sdk/v3';
import axios from 'axios';
import { addMinutes } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { generate } from 'triggers/agents/chat/stream-utils';

const prisma = new PrismaClient();

export const beautifyTask = task({
  id: 'beautify-task',
  queue: {
    name: 'beautify-task',
    concurrencyLimit: 10,
  },
  run: async (payload: { taskId: string; pat: string }) => {
    const solTask = await prisma.task.findUnique({
      where: { id: payload.taskId },
      select: {
        id: true,
        workspaceId: true,
        listId: true,
        workspace: true,
        page: {
          select: {
            id: true,
            title: true,
            description: true,
          },
        },
      },
    });

    logger.info(JSON.stringify(solTask));

    const agentWorklog = await prisma.agentWorklog.create({
      data: {
        modelId: payload.taskId,
        modelName: ModelNameEnum.Task,
        state: AgentWorklogStateEnum.Thinking,
        type: 'Beautify Task',
        workspaceId: solTask.workspaceId,
      },
    });

    const listsData = await prisma.list.findMany({
      where: { deleted: null, workspaceId: solTask.workspaceId },
      include: { page: true },
    });

    const lists = listsData.map((list) => `${list.id}_${list.page.title}`);
    let updatedTask;

    try {
      const timezone = (solTask.workspace.preferences as Preferences).timezone;
      let beautifyOutput = '';

      // Run both API requests in parallel
      const [recurrenceData] = await Promise.all([
        axios
          .post(
            `${process.env.BACKEND_HOST}/v1/tasks/ai/recurrence`,
            {
              text: solTask.page.title,
              currentTime: formatInTimeZone(
                new Date(),
                timezone,
                "yyyy-MM-dd'T'HH:mm:ssXXX",
              ),
              taskIds: [],
            },
            { headers: { Authorization: `Bearer ${payload.pat}` } },
          )
          .then((response) => response.data),
      ]);

      const gen = generate(
        [
          {
            role: 'user',
            content: beautifyPrompt
              .replace('{{text}}', solTask.page.title)
              .replace('{{lists}}', lists.join('\n')),
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
          beautifyOutput += chunk;
        } else if (chunk && typeof chunk === 'object' && chunk.message) {
          beautifyOutput += chunk.message;
        }
      }

      const outputMatch = beautifyOutput.match(/<output>(.*?)<\/output>/s);

      logger.info(`Recurrence data: ${JSON.stringify(recurrenceData)}`);
      logger.info(`Beautify data: ${JSON.stringify(beautifyOutput)}`);

      if (!outputMatch) {
        logger.error('No output found in recurrence response');
        await prisma.agentWorklog.update({
          where: { id: agentWorklog.id },
          data: { state: AgentWorklogStateEnum.Failed },
        });
        throw new Error('Invalid response format from AI');
      }

      const jsonStr = outputMatch[1].trim();
      const beautifyData = JSON.parse(jsonStr);
      const outputData = { ...recurrenceData, ...beautifyData };
      if (outputData) {
        if (outputData.listId) {
          outputData.listId = outputData.listId.includes('_')
            ? outputData.listId.split('_')[0]
            : outputData.listId;
        }

        const updateData = {
          // Basic task fields
          ...(outputData.startTime && {
            startTime: new Date(outputData.startTime),
          }),
          ...(outputData.endTime && {
            endTime: outputData.endTime
              ? new Date(outputData.endTime)
              : addMinutes(outputData.startTime, 15).toISOString(),
          }),

          // Recurrence related fields
          ...(outputData.recurrenceRule && {
            recurrence: outputData.recurrenceRule,
          }),

          ...(Array.isArray(outputData.recurrenceRule) &&
            outputData.recurrenceRule.length > 0 &&
            outputData.scheduleText && {
              scheduleText: outputData.scheduleText,
            }),

          ...(outputData.listId &&
            !solTask.listId && {
              list: { connect: { id: outputData.listId } },
            }),
        };

        updatedTask = await prisma.task.update({
          where: { id: payload.taskId },
          data: updateData,
          include: {
            page: true,
          },
        });
      }

      await prisma.agentWorklog.update({
        where: { id: agentWorklog.id },
        data: { state: AgentWorklogStateEnum.Done },
      });
    } catch (error) {
      console.log(error);
      logger.error(`Beautify failed: ${JSON.stringify(error)}`);

      await prisma.agentWorklog.update({
        where: { id: agentWorklog.id },
        data: { state: AgentWorklogStateEnum.Failed },
      });
      throw new Error('Invalid JSON in AI response');
    }

    return {
      task: updatedTask,
    };
  },
});
