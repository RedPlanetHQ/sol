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
