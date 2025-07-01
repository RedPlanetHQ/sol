import { z } from 'zod';

export const RetrieveMemorySchema = z.object({
  queries: z.array(z.string()).describe('Queries to retrieve memory'),
});

export type RetrieveMemoryParams = z.infer<typeof RetrieveMemorySchema>;
