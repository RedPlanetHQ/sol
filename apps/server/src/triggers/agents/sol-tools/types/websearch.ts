import { z } from 'zod';

export const WebSearchSchema = z.object({
  query: z
    .string()
    .min(1)
    .describe('The search query to find relevant web content'),
  numResults: z
    .number()
    .min(1)
    .max(20)
    .optional()
    .default(5)
    .describe('Number of results to return (1-20, default: 5)'),
  includeContent: z
    .boolean()
    .optional()
    .default(false)
    .describe('Whether to include full page content in results'),
  includeHighlights: z
    .boolean()
    .optional()
    .default(false)
    .describe('Whether to include relevant text highlights from pages'),
  domains: z
    .array(z.string())
    .optional()
    .describe(
      'Array of domains to include in search (e.g., ["github.com", "stackoverflow.com"])',
    ),
  excludeDomains: z
    .array(z.string())
    .optional()
    .describe('Array of domains to exclude from search'),
  startCrawlDate: z
    .string()
    .optional()
    .describe('Start date for content crawling in YYYY-MM-DD format'),
  endCrawlDate: z
    .string()
    .optional()
    .describe('End date for content crawling in YYYY-MM-DD format'),
  startPublishedDate: z
    .string()
    .optional()
    .describe('Start date for content publishing in YYYY-MM-DD format'),
  endPublishedDate: z
    .string()
    .optional()
    .describe('End date for content publishing in YYYY-MM-DD format'),
});

export type WebSearchArgs = z.infer<typeof WebSearchSchema>;
