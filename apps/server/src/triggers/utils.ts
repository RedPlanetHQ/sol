import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const init = async (payload: any) => {
  const { workspaceId } = payload;

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
  });
  const apiKey = await prisma.apikey.findFirst({
    where: { userId: workspace.userId, name: 'default', enabled: true },
  });

  axios.interceptors.request.use((config) => {
    // Check if URL starts with /api and doesn't have a full host
    if (config.url?.startsWith('/api')) {
      config.url = `${process.env.BACKEND_HOST}${config.url}`;
    }

    // Add authorization header if not present and we have an API key
    if (!config.headers?.['Authorization'] && apiKey?.key) {
      config.headers.Authorization = `Bearer ${apiKey.key}`;
    }

    return config;
  });

  return payload;
};

export const createActivity = async (activity: {
  taskId?: string;
  text: string;
  sourceURL?: string;
  integrationAccountId?: string;
  rejectionReason?: string;
  workspaceId: string;
}) => {
  return await prisma.activity.create({
    data: activity,
  });
};
