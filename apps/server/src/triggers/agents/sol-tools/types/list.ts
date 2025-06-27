import { z } from 'zod';

export const CreateListSchema = z.object({
  title: z.string().describe('Title of the list'),
});

export type CreateListParams = z.infer<typeof CreateListSchema>;

export const ListSchema = z.object({
  listId: z.string().uuid().describe('Unique identifier of the list'),
});

export type ListParams = z.infer<typeof ListSchema>;

export const UpdateListSchema = z.object({
  listId: z.string().uuid().describe('Unique identifier of the list'),
  htmlDescription: z
    .string()
    .optional()
    .describe('New description for the list'),
});

export type UpdateListParams = z.infer<typeof UpdateListSchema>;

export const UpdatePartialListDescriptionSchema = z.object({
  listId: z.string().uuid().describe('Unique identifier of the list to update'),
  pageDescription: z
    .string()
    .optional()
    .describe('Description for the list page in tiptap HTML format'),
  operation: z
    .enum(['insert', 'replace', 'append', 'prepend', 'delete'])
    .describe('Operation to perform on the list page'),
  startOffset: z.number().optional().describe('Start offset for the operation'),
  endOffset: z.number().optional().describe('End offset for the operation'),
  findText: z
    .object({
      text: z.string().describe('Text to find in the list page'),
      ignoreCase: z
        .boolean()
        .optional()
        .describe('Ignore case when finding text'),
    })
    .optional(),
});

export type UpdatePartialListDescriptionParams = z.infer<
  typeof UpdatePartialListDescriptionSchema
>;

export const DeleteListSchema = z.object({
  listId: z.string().uuid().describe('Unique identifier of the list to delete'),
});

export type DeleteListParams = z.infer<typeof DeleteListSchema>;

export const GetListsSchema = z.object({
  page: z
    .number()
    .int()
    .min(1)
    .default(1)
    .describe('Page number, starting from 1'),
  pageSize: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(100)
    .describe('Number of items per page'),
});

export type GetListsParams = z.infer<typeof GetListsSchema>;
