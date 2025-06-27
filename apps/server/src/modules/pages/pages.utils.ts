import { JsonValue, Page, PublicPage, Task } from '@redplanethq/sol-sdk';
import {
  convertHtmlToTiptapJson,
  convertTiptapJsonToHtml,
} from '@sol/editor-extensions';

export interface UpdatePartialPageDto {
  // HTML content to insert/replace
  htmlContent?: string;
  // Operation type
  operation: 'insert' | 'replace' | 'append' | 'prepend' | 'delete';
  // Start position for the operation (character offset)
  startOffset?: number;
  // End position for replace/delete operations (character offset)
  endOffset?: number;
  // Number of characters to delete/replace
  length?: number;
  // Text to find and position the operation at
  findText?: {
    text: string;
    ignoreCase?: boolean;
  };
}

/**
 * Updates HTML content based on position and operation
 * @param html - Original HTML content
 * @param options - Update options
 * @returns Updated HTML content
 */
export function updateHtmlContent(
  html: string,
  options: UpdatePartialPageDto,
): string {
  const {
    operation,
    htmlContent = '',
    startOffset = 0,
    endOffset,
    length,
  } = options;

  // Calculate end offset for replace/delete operations
  let finalEndOffset = endOffset;
  if (!finalEndOffset && length !== undefined) {
    finalEndOffset = startOffset + length;
  } else if (!finalEndOffset) {
    finalEndOffset = startOffset;
  }

  // Apply the operation
  switch (operation) {
    case 'insert':
      let finalStartOffset = startOffset;
      if (length) {
        finalStartOffset += length;
      }
      return (
        html.slice(0, finalStartOffset) +
        htmlContent +
        html.slice(finalStartOffset)
      );

    case 'replace':
      return (
        html.slice(0, startOffset) + htmlContent + html.slice(finalEndOffset)
      );

    case 'append':
      return html + htmlContent;

    case 'prepend':
      return htmlContent + html;

    case 'delete':
      return html.slice(0, startOffset) + html.slice(finalEndOffset);

    default:
      throw new Error(`Unsupported operation: ${operation}`);
  }
}

/**
 * Updates HTML content and ensures it remains valid Tiptap JSON
 * @param html - Original HTML content
 * @param options - Update options
 * @returns Valid HTML content after update
 */
export function updateHtmlContentSafely(
  html: string,
  options: UpdatePartialPageDto,
): string {
  // First perform the raw HTML update
  const updatedHtml = updateHtmlContent(html, options);

  // Then convert to Tiptap JSON and back to ensure validity
  const json = convertHtmlToTiptapJson(updatedHtml);
  return convertTiptapJsonToHtml(json);
}

/**
 * Finds the position of a text pattern in the HTML content
 * @param html - HTML content to search in
 * @param pattern - Text pattern to find
 * @param ignoreCase - Whether to ignore case when matching
 * @returns Character offset of the match or -1 if not found
 */
export function findTextPosition(
  html: string,
  pattern: string,
  ignoreCase = false,
): number {
  const searchHtml = ignoreCase ? html.toLowerCase() : html;
  const searchPattern = ignoreCase ? pattern.toLowerCase() : pattern;

  return searchHtml.indexOf(searchPattern);
}

export function getTaskListsInPage(page: PublicPage) {
  const description = page.description;

  try {
    const descriptionJson =
      typeof description === 'string' ? JSON.parse(description) : description;

    // Find all taskList nodes in the document content
    const taskLists =
      descriptionJson.content?.filter(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (node: any) => node.type === 'taskList',
      ) || [];

    return taskLists;
  } catch (error) {
    console.error('Error parsing page description:', error);
    return [];
  }
}

export function updateTaskListsInPage(
  page: PublicPage,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updatedTaskLists: Array<Record<string, any>>,
) {
  try {
    const descriptionJson =
      typeof page.description === 'string'
        ? JSON.parse(page.description)
        : page.description || { type: 'doc', content: [] };

    // Find all taskList nodes and their indices
    const taskListIndices: number[] = [];
    descriptionJson.content?.forEach(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node: any, index: number) => {
        if (node.type === 'taskList') {
          taskListIndices.push(index);
        }
      },
    );

    // If we have existing task lists and updated task lists
    if (taskListIndices.length > 0 && updatedTaskLists.length > 0) {
      // Update the first task list
      const [firstTaskListIndex] = taskListIndices;
      const updatedTaskList = updatedTaskLists[0];
      descriptionJson.content[firstTaskListIndex] = updatedTaskList;

      // If there are additional updated task lists that don't exist in the document.
      // Used while removing a task in all task lists
      if (updatedTaskLists.length > taskListIndices.length) {
        // Add the new task lists after the last existing task list
        const insertPosition = taskListIndices[taskListIndices.length - 1] + 1;
        descriptionJson.content.splice(
          insertPosition,
          0,
          ...updatedTaskLists.slice(taskListIndices.length),
        );
      }
    } else if (updatedTaskLists.length > 0) {
      // No existing task lists, but we have updated ones to add
      // Add them at the beginning of the content
      descriptionJson.content = [
        ...updatedTaskLists,
        ...descriptionJson.content,
      ];
    }
    // If no updated task lists, we don't need to change anything

    return descriptionJson;
  } catch (error) {
    console.error('Error updating taskLists in page:', error);
    return JSON.parse(page.description);
  }
}

export function getTaskItemContent(title: string) {
  return [
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: title,
        },
      ],
    },
  ];
}

export function upsertTasksInPage(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  taskLists: Array<Record<string, any>>,
  tasks: Task[],
) {
  // Create a Set of existing task IDs for O(1) lookup
  const existingTaskIds = new Set(getCurrentTaskIds({ content: taskLists }));

  // Add only new tasks
  const newTasks = tasks.filter((task: Task) => !existingTaskIds.has(task.id));

  if (newTasks.length === 0) {
    return taskLists;
  }

  // Create new task list items
  const newTaskListItems = newTasks.map((task: Task) => ({
    type: 'taskItem',
    attrs: {
      id: task.id,
    },
    content: getTaskItemContent(task.page.title),
  }));

  // If there's an existing taskList, add to it, otherwise create a new one
  if (taskLists.length > 0) {
    // Add to the first taskList
    taskLists[0].content = [
      ...(taskLists[0].content || []),
      ...newTaskListItems,
    ];
  } else {
    // Create a new taskList
    taskLists.push({
      type: 'taskList',
      content: newTaskListItems,
    });
  }

  return taskLists;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getCurrentTaskIds(tiptapJson: any): string[] {
  const taskIds: string[] = [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const findTaskIds = (node: any) => {
    // Check if node is a task
    if (node.type === 'taskItem' && node.attrs?.id) {
      taskIds.push(node.attrs.id);
      return;
    }

    // Recursively check content array
    if (node.content && Array.isArray(node.content)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      node.content.forEach((child: any) => findTaskIds(child));
    }
  };

  // Start traversing from the root
  if (tiptapJson.content) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tiptapJson.content.forEach((node: any) => findTaskIds(node));
  }

  // Remove duplicates and return
  return [...new Set(taskIds)];
}

export function removeTasksFromPage(page: Page, taskIds: string[]) {
  try {
    const descriptionJson =
      typeof page.description === 'string'
        ? JSON.parse(page.description)
        : page.description || { type: 'doc', content: [] };

    // Process each taskList in the content
    if (descriptionJson.content) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      descriptionJson.content = descriptionJson.content.map((node: any) => {
        // Only process taskList nodes
        if (node.type === 'taskList') {
          return {
            ...node,
            // Filter out tasks with matching IDs
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            content: node.content?.filter((listItem: any) => {
              // Keep the listItem if the task ID is not in the list to remove
              return !taskIds.includes(listItem.attrs?.id);
            }),
          };
        }
        // Return other nodes unchanged
        return node;
      });

      // Remove empty taskLists
      descriptionJson.content = descriptionJson.content.filter(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (node: any) =>
          node.type !== 'taskList' || (node.content && node.content.length > 0),
      );
    }

    return JSON.stringify(descriptionJson);
  } catch (error) {
    console.error('Error removing tasks from page:', error);
    return page.description;
  }
}

export function getOutlinksTaskId(pageOutlinks: JsonValue) {
  // Extract taskIds from current outlinks
  if (!pageOutlinks || !Array.isArray(pageOutlinks)) {
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (
    pageOutlinks
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((outlink: any) => outlink.id)
  );
}

/**
 * Serializes a page object for API responses
 * - Converts description from JSON to HTML
 * - Excludes descriptionBinary field
 * - Handles error cases gracefully
 */
export function serializePage(page: Page): Omit<Page, 'descriptionBinary'> {
  if (!page) {
    return null;
  }

  // Create a new object without descriptionBinary
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { descriptionBinary, ...serializedPage } = page;

  // Convert description to HTML if it exists
  if (serializedPage.description) {
    try {
      const descriptionJson =
        typeof serializedPage.description === 'string'
          ? JSON.parse(serializedPage.description as string)
          : serializedPage.description;
      serializedPage.description = convertTiptapJsonToHtml(descriptionJson);
    } catch (error) {
      console.error(`Failed to parse description for page ${page.id}:`, error);
      // Keep the original description if parsing fails
    }
  }

  return serializedPage;
}

/**
 * Serializes an array of pages for API responses
 */
export function serializePages(
  pages: Page[],
): Array<Omit<Page, 'descriptionBinary'>> {
  if (!pages || !Array.isArray(pages)) {
    return [];
  }
  return pages.map(serializePage);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const dataChanged = (changedData: any, key: string) => {
  return (
    changedData[key] && changedData[key].oldValue !== changedData[key].newValue
  );
};
