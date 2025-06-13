import axios from 'axios';

import {
  CreateTaskParams,
  UpdateTaskParams,
  GetTaskParams,
  DeleteTaskParams,
  SearchTasksParams,
  Task,
  CreateAssistantTaskParams,
  UpdateAssistantTaskParams,
  DeleteAssistantTaskParams,
} from '../types/task.js';

/**
 * Get a task by its ID
 * @param params The task ID parameters
 * @returns The task data
 */
export async function getTaskById(params: GetTaskParams) {
  const response = await axios.get(`/api/v1/tasks/${params.task_id}`);

  return response.data;
}

/**
 * Create a new task
 * @param params Task creation parameters
 * @returns The created task
 */
export async function createTask(params: CreateTaskParams) {
  const response = await axios.post(`/api/v1/tasks`, {
    title: params.title,
    status: params.status,
    integrationAccountId: params.integrationAccountId,
    pageDescription: params.pageDescription,
    source: {
      url: params.sourceUrl,
      type: 'external',
    },
  });
  return response.data;
}

/**
 * Update an existing task
 * @param params Task update parameters
 * @returns The updated task
 */
export async function updateTask(params: UpdateTaskParams) {
  const updateData = {
    ...(params.title && { title: params.title }),
    ...(params.status && { status: params.status }),
    ...(params.pageDescription && { pageDescription: params.pageDescription }),
  };

  const response = await axios.post(
    `/api/v1/tasks/${params.taskId}`,
    updateData,
  );
  return response.data;
}

/**
 * Delete a task by its ID
 * @param params The task ID parameters
 * @returns The deletion result
 */
export async function deleteTask(params: DeleteTaskParams) {
  const response = await axios.delete(`/api/v1/tasks/${params.task_id}`);

  return response.data;
}

/**
 * Search for tasks based on query string within a workspace
 * @param params Search parameters including query string and workspace ID
 * @returns Array of matching tasks
 */
export async function searchTasks(params: SearchTasksParams): Promise<Task[]> {
  const response = await axios.get(`/api/v1/tasks/search`, {
    params: {
      query: params.query,
    },
  });

  return response.data;
}

export async function createAssistantTask(params: CreateAssistantTaskParams) {
  const response = await axios.post(`/api/v1/tasks`, {
    ...params,
    metadata: { assignee: 'assistant' },
  });
  return response.data;
}

export async function updateAssistantTask(params: UpdateAssistantTaskParams) {
  const { taskId, ...data } = params;
  const response = await axios.post(`/api/v1/tasks/${taskId}`, data);
  return response.data;
}

export async function deleteAssistantTask(params: DeleteAssistantTaskParams) {
  const response = await axios.delete(`/api/v1/tasks/${params.taskId}`);
  return response.data;
}
