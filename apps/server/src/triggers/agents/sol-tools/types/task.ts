import { z } from 'zod';
// Task schemas
export const TaskStatusEnum = z.enum(['Todo', 'In-progress', 'Done']);

export const TaskSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  status: TaskStatusEnum,
  parentId: z.string().uuid().optional(),
  integrationAccountId: z.string().optional(),
  pageDescription: z.string().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const GetTaskSchema = z.object({
  task_id: z
    .string()
    .uuid()
    .describe('Unique identifier of the task to retrieve'),
});

export const CreateTaskSchema = z.object({
  title: z.string().describe('Title of the task'),
  status: TaskStatusEnum.describe('Status of the task'),
  integrationAccountId: z
    .string()
    .optional()
    .nullable()
    .describe('Integration account ID'),
  pageDescription: z
    .string()
    .optional()
    .nullable()
    .describe('Description for the task page in tiptap HTML format'),
  sourceUrl: z
    .string()
    .optional()
    .nullable()
    .describe('URL of the source where this task originated from'),
  startTime: z
    .string()
    .optional()
    .nullable()
    .describe(
      'The scheduled start date and time for this task in ISO 8601 format, including timezone offset (e.g., "2024-06-12T09:00:00+10:00"). Use the timezone from the provided context (e.g., todayDate) unless otherwise specified. Set this to schedule the task.',
    ),
  endTime: z
    .string()
    .optional()
    .nullable()
    .describe(
      'The scheduled end date and time for this task in ISO 8601 format, including timezone offset (e.g., "2024-06-12T10:00:00+10:00"). Use the timezone from the provided context (e.g., todayDate) unless otherwise specified. Optional; set if the task has a specific end time.',
    ),
  recurrence: z.array(z.string()).optional().describe('RRULE for the task'),
  listId: z.string().optional().describe('List ID of the task'),
  parentId: z.string().optional().describe('Parent task ID of the task'),
});

export const UpdateTaskSchema = z.object({
  taskId: z.string().uuid().describe('Unique identifier of the task to update'),
  title: z.string().optional().describe('New title for the task'),
  status: TaskStatusEnum.optional().describe('Updated status of the task'),
  pageDescription: z
    .string()
    .optional()
    .describe('Description for the task page in tiptap HTML format'),
  startTime: z
    .string()
    .optional()
    .nullable()
    .describe(
      'The scheduled start date and time for this task in ISO 8601 format, including timezone offset (e.g., "2024-06-12T09:00:00+10:00"). Use the timezone from the provided context (e.g., todayDate) unless otherwise specified. Set this to schedule the task.',
    ),
  endTime: z
    .string()
    .optional()
    .nullable()
    .describe(
      'The scheduled end date and time for this task in ISO 8601 format, including timezone offset (e.g., "2024-06-12T10:00:00+10:00"). Use the timezone from the provided context (e.g., todayDate) unless otherwise specified. Optional; set if the task has a specific end time.',
    ),
  recurrence: z.array(z.string()).optional().describe('RRULE for the task'),
  listId: z.string().optional().describe('List ID of the task'),
  parentId: z.string().optional().describe('Parent task ID of the task'),
});

export const UpdatePartialTaskDescriptionSchema = z.object({
  taskId: z.string().uuid().describe('Unique identifier of the task to update'),
  pageDescription: z
    .string()
    .optional()
    .describe('Description for the task page in tiptap HTML format'),
  operation: z
    .enum(['insert', 'replace', 'append', 'prepend', 'delete'])
    .describe('Operation to perform on the task page'),
  startOffset: z.number().optional().describe('Start offset for the operation'),
  endOffset: z.number().optional().describe('End offset for the operation'),
  findText: z
    .object({
      text: z.string().describe('Text to find in the task page'),
      ignoreCase: z
        .boolean()
        .optional()
        .describe('Ignore case when finding text'),
    })
    .optional(),
});

export const DeleteTaskSchema = z.object({
  task_id: z
    .string()
    .uuid()
    .describe('Unique identifier of the task to delete'),
});

export const SearchTasksSchema = z.object({
  query: z.string().describe(
    `Advanced search query with GitHub-like syntax.
    Supported fields (ONLY these are allowed):
    - status:Todo or status:Done — filter by task status
    - list:LIST_ID — filter by list ID
    - workspace:WORKSPACE_ID — filter by workspace ID
    - due:<YYYY-MM-DD or due:>YYYY-MM-DD — filter by due date before/after
    - is:subtask — filter to show only subtasks (tasks that have a parent task)
    - is:unplanned or unplanned:true/false — filter for tasks that are not scheduled/planned (i.e., have no TaskOccurrence)
    - q:free_text — search in task titles (e.g., "meeting")
  
    DO NOT use unsupported fields such as "sourceURL", "assignee", etc. in queries.
  
    Combine multiple filters with spaces, e.g.:
    "q:meeting status:Todo list:abc-123 due:<2025-06-01"`,
  ),
});

export const createAssistantTaskSchema = z.object({
  title: z.string().describe('Title of the task'),
  status: TaskStatusEnum.describe('Status of the task'),
  pageDescription: z
    .string()
    .optional()
    .describe('Description of the task in HTML format'),
  startTime: z
    .string()
    .optional()
    .describe('Start time of the task in ISO 8601 format'),
  endTime: z
    .string()
    .optional()
    .describe('End time of the task in ISO 8601 format'),
});

export const updateAssistantTaskSchema = z.object({
  taskId: z.string().uuid().describe('Unique identifier of the task to update'),
  title: z.string().optional().describe('New title for the task'),
  status: TaskStatusEnum.optional().describe('Updated status of the task'),
  pageDescription: z
    .string()
    .optional()
    .describe('Description of the task in HTML format'),
  startTime: z
    .string()
    .optional()
    .describe('Start time of the task in ISO 8601 format'),
  endTime: z
    .string()
    .optional()
    .describe('End time of the task in ISO 8601 format'),
});

export type Task = z.infer<typeof TaskSchema>;
export type TaskStatus = z.infer<typeof TaskStatusEnum>;
export type GetTaskParams = z.infer<typeof GetTaskSchema>;
export type CreateTaskParams = z.infer<typeof CreateTaskSchema>;
export type UpdateTaskParams = z.infer<typeof UpdateTaskSchema>;
export type UpdatePartialTaskDescriptionParams = z.infer<
  typeof UpdatePartialTaskDescriptionSchema
>;
export type DeleteTaskParams = z.infer<typeof DeleteTaskSchema>;
export type SearchTasksParams = z.infer<typeof SearchTasksSchema>;
export type CreateAssistantTaskParams = z.infer<
  typeof createAssistantTaskSchema
>;
export type UpdateAssistantTaskParams = z.infer<
  typeof updateAssistantTaskSchema
>;
