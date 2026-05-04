import type { NewsItem, NewsProviderStatus } from '@repo/api-contracts';

export type FetchNewsInput = {
  symbols: string[];
  fromIso: string;
  toIso: string;
  timeoutMs?: number;
  maxItemsPerSymbol?: number;
  forceMock?: boolean;
};

export type FetchNewsOutput = {
  items: NewsItem[];
  providerStatus: NewsProviderStatus;
};

export interface NewsProvider {
  readonly key: 'finnhub' | 'polygon' | 'mock';
  isConfigured(): boolean;
  fetchNews(input: FetchNewsInput): Promise<FetchNewsOutput>;
}
