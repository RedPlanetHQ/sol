import { tool } from 'ai';
import { z } from 'zod';

import { formatSolError, isSolError } from './errors';
import {
  createList,
  getList,
  getLists,
  updateList,
  updateListPartial,
} from './operations/list';
import { retrieveMemory } from './operations/memory';
import {
  createTask,
  deleteTask,
  getTaskById,
  searchTasks,
  updateTask,
  updateTaskPartial,
} from './operations/task';
import { createAssistantTask, updateAssistantTask } from './operations/task';
import {
  CreateListSchema,
  GetListsSchema,
  ListSchema,
  UpdateListSchema,
  UpdatePartialListDescriptionSchema,
} from './types/list';
import { RetrieveMemorySchema } from './types/memory';
import {
  createAssistantTaskSchema,
  CreateTaskSchema,
  DeleteTaskSchema,
  GetTaskSchema,
  SearchTasksSchema,
  updateAssistantTaskSchema,
  UpdatePartialTaskDescriptionSchema,
  UpdateTaskSchema,
} from './types/task';

export function getSolTools(isMemoryConfigured = false) {
  return {
    'sol--get_lists': tool({
      description:
        'Retrieves ALL lists in the workspace with no filtering. PRIMARY TOOL for questions like "show me my lists", "what lists do I have", or when user wants to browse/see all lists. Returns list IDs, titles, icons, and metadata. NO PARAMETERS NEEDED - just call with empty object {}.',
      parameters: GetListsSchema,
    }),

    'sol--get_list_by_id': tool({
      description:
        "Gets a SPECIFIC list's complete details using its exact ID. ONLY use when you already have a specific list_id. Returns list details, associated page content and tasks. NOT for browsing or searching lists - use get_lists instead. REQUIRES list_id parameter.",
      parameters: ListSchema,
    }),

    'sol--create_list': tool({
      description:
        'Creates a brand new list with specified title and optional icon. Use when user explicitly asks to create a new list. NOT for adding items to existing lists (use update_page for that). REQUIRES title parameter, icon is optional.',
      parameters: CreateListSchema,
    }),

    'sol--update_list': tool({
      description:
        'Updates an existing list with specified title and optional icon. Use when user explicitly asks to update a list. NOT for adding items to existing lists (use update_page for that). REQUIRES title parameter, icon is optional.',
      parameters: UpdateListSchema,
    }),

    'sol--update_list_partial_content': tool({
      description:
        'Makes targeted updates to list page HTML content using position-based operations. Perfect for inserting, replacing, or deleting specific portions of content without modifying the entire page. Supports operations by character offset or text search. REQUIRES listId parameter and operation type (insert/replace/append/prepend/delete).',
      parameters: UpdatePartialListDescriptionSchema,
    }),

    'sol--search_tasks': tool({
      description: `Advanced task search using GitHub-like syntax. 
PERFECT FOR FILTERING tasks by status, list, dates, etc.

Supported filters (ONLY these are allowed):
- status:Todo/Done/Cancelled — filter by task status
- list:LIST_ID — filter by list ID
- workspace:WORKSPACE_ID — filter by workspace ID
- due:<YYYY-MM-DD or due:>YYYY-MM-DD — filter by due date before/after
- is:subtask — filter to show only subtasks (tasks that have a parent task)
- is:unplanned or unplanned:true/false — filter for tasks that are not scheduled/planned (i.e., have no TaskOccurrence)
- q:free_text — search in task titles (e.g., "meeting")
- assignee:user/assistant - filter for tasks assigned to user or assistant
DO NOT use unsupported fields such as "sourceUrl", etc. in queries.
Combine multiple filters with spaces, e.g.:
"meeting status:Todo list:abc-123 due:<2025-06-01"`,
      parameters: SearchTasksSchema,
    }),

    'sol--get_task_by_id': tool({
      description:
        "Retrieves a SINGLE task's complete details using its exact ID. ONLY use when you have a specific task_id from previous results. Returns task properties, status, dates, and page content. NOT for searching or filtering tasks - use search_tasks instead. REQUIRES task_id parameter.",
      parameters: GetTaskSchema,
    }),

    'sol--create_task': tool({
      description:
        'Creates a standalone task not connected to any page. LAST RESORT for task creation - in most cases, prefer updating a page to add tasks (update_page). Use ONLY when no relevant page exists or explicitly creating a standalone task. REQUIRES title and status parameters, others optional.',
      parameters: CreateTaskSchema,
    }),

    'sol--update_task': tool({
      description:
        "Updates an existing task's properties like title, status, etc. PERFECT for status changes (marking complete) or updating task metadata. Does NOT modify page content - use update_page for that. REQUIRES taskId parameter and at least one property to change.",
      parameters: UpdateTaskSchema,
    }),

    'sol--delete_task': tool({
      description:
        'Permanently deletes a task. DESTRUCTIVE ACTION - use with caution and confirmation. REQUIRES task_id parameter.',
      parameters: DeleteTaskSchema,
    }),

    'sol--update_task_partial_content': tool({
      description:
        'Makes targeted updates to task page HTML content using position-based operations. Perfect for inserting, replacing, or deleting specific portions of content without modifying the entire page. Supports operations by character offset or text search. REQUIRES taskId parameter and operation type (insert/replace/append/prepend/delete).',
      parameters: UpdatePartialTaskDescriptionSchema,
    }),

    'sol--create_assistant_task': tool({
      description:
        'Creates a task assigned to the assistant with instructions. Use when user explicitly asks to create a task for the assistant. REQUIRES title and instructions parameters, others optional.',
      parameters: createAssistantTaskSchema,
    }),

    'sol--update_assistant_task': tool({
      description:
        'Updates an existing task assigned to the assistant. PERFECT for status changes (marking complete) or updating task metadata. Does NOT modify page content - use update_page for that. REQUIRES taskId parameter and at least one property to change.',
      parameters: updateAssistantTaskSchema,
    }),

    ...(isMemoryConfigured
      ? {
          'sol--get_my_memory': tool({
            description:
              'Connects you to your memory about the user. This memory is a core part of your identity and cognitive process - not just information you access but who you are. Your personalized understanding of the user comes from these memories. Use specific, factual statements as queries (e.g., "user email address" not "what is their email?"). For complex interactions, make multiple targeted retrievals to build a complete understanding.',
            parameters: RetrieveMemorySchema,
          }),
        }
      : {}),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function callSolTool(name: string, parameters: any) {
  try {
    if (!parameters) {
      throw new Error('Arguments are required');
    }

    const toolName = name.split('--')[1];

    switch (toolName) {
      case 'search_tasks': {
        const args = SearchTasksSchema.parse(parameters);
        const result = await searchTasks(args);
        return JSON.stringify(result, null, 2);
      }
      case 'get_lists': {
        const args = GetListsSchema.parse(parameters);
        const result = await getLists(args);
        return JSON.stringify(result, null, 2);
      }
      case 'get_list_by_id': {
        const args = ListSchema.parse(parameters);
        const result = await getList(args);
        return JSON.stringify(result, null, 2);
      }
      case 'create_list': {
        const args = CreateListSchema.parse(parameters);
        const result = await createList(args);
        return JSON.stringify(result, null, 2);
      }
      case 'update_list': {
        const args = UpdateListSchema.parse(parameters);
        const result = await updateList(args);
        return JSON.stringify(result, null, 2);
      }
      case 'update_list_partial_content': {
        const args = UpdatePartialListDescriptionSchema.parse(parameters);
        const result = await updateListPartial(args);
        return JSON.stringify(result, null, 2);
      }
      case 'get_task_by_id': {
        const args = GetTaskSchema.parse(parameters);
        const result = await getTaskById(args);
        return JSON.stringify(result, null, 2);
      }
      case 'create_task': {
        const args = CreateTaskSchema.parse(parameters);
        const result = await createTask(args);
        return JSON.stringify(result, null, 2);
      }
      case 'update_task': {
        const args = UpdateTaskSchema.parse(parameters);
        const result = await updateTask(args);
        return JSON.stringify(result, null, 2);
      }
      case 'delete_task': {
        const args = DeleteTaskSchema.parse(parameters);
        const result = await deleteTask(args);
        return JSON.stringify(result, null, 2);
      }
      case 'update_task_partial': {
        const args = UpdatePartialTaskDescriptionSchema.parse(parameters);
        const result = await updateTaskPartial(args);
        return JSON.stringify(result, null, 2);
      }
      case 'get_my_memory': {
        const args = RetrieveMemorySchema.parse(parameters);
        const result = await retrieveMemory(args);
        return JSON.stringify(result, null, 2);
      }
      case 'create_assistant_task': {
        const args = createAssistantTaskSchema.parse(parameters);
        const result = await createAssistantTask(args);
        return JSON.stringify(result, null, 2);
      }
      case 'update_assistant_task': {
        const args = updateAssistantTaskSchema.parse(parameters);
        const result = await updateAssistantTask(args);
        return JSON.stringify(result, null, 2);
      }
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid input: ${JSON.stringify(error.errors)}`);
    }
    if (isSolError(error)) {
      throw new Error(formatSolError(error));
    }
    throw error;
  }
}
