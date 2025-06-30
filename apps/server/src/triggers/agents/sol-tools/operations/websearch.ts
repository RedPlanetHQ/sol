import { Exa } from 'exa-js';

import { WebSearchArgs } from '../types/websearch';

export interface WebSearchResult {
  results: Array<{
    title: string;
    url: string;
    content: string;
    publishedDate: string;
    highlights: string[];
    text: string;
    score: number;
  }>;
}

export async function webSearch(args: WebSearchArgs): Promise<WebSearchResult> {
  const apiKey = process.env.EXA_API_KEY;

  if (!apiKey) {
    throw new Error(
      'EXA_API_KEY environment variable is required for web search',
    );
  }

  const exa = new Exa(apiKey);

  try {
    const searchOptions = {
      numResults: args.numResults || 5,
      ...(args.domains && { includeDomains: args.domains }),
      ...(args.excludeDomains && { excludeDomains: args.excludeDomains }),
      ...(args.startCrawlDate && { startCrawlDate: args.startCrawlDate }),
      ...(args.endCrawlDate && { endCrawlDate: args.endCrawlDate }),
      ...(args.startPublishedDate && {
        startPublishedDate: args.startPublishedDate,
      }),
      ...(args.endPublishedDate && { endPublishedDate: args.endPublishedDate }),
    };

    let result;

    if (args.includeContent || args.includeHighlights) {
      // Use searchAndContents for rich results
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const contentsOptions: any = {
        ...searchOptions,
      };

      if (args.includeContent) {
        contentsOptions.text = true;
      }

      if (args.includeHighlights) {
        contentsOptions.highlights = true;
      }

      result = await exa.searchAndContents(args.query, contentsOptions);
    } else {
      // Use basic search for URLs only
      result = await exa.search(args.query, searchOptions);
    }

    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      results: result.results.map((item: any) => ({
        title: item.title,
        url: item.url,
        content: item.text,
        publishedDate: item.publishedDate,
        highlights: item.highlights,
        text: item.text,
        score: item.score,
      })),
    };
  } catch (error) {
    throw new Error(
      `Web search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}
