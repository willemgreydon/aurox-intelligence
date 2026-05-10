import type { Locale } from '@repo/api-contracts';
import type { AppMessages } from '../../lib/i18n/messages';
import { mapMarketTicker, mapMarketTickerViewModel, type MarketTickerViewModel } from '../mappers/market-ticker-mapper';
import { getMarketTickerReadModel, type MarketTickerReadModel } from '../queries/market-ticker-query';
import { withTimeout } from '../lib/with-timeout';

const TICKER_TIMEOUT_MS = 3_000;

function buildEmptyReadModel(): MarketTickerReadModel {
  return {
    provider: 'cache',
    providerError: 'Ticker snapshot is temporarily unavailable.',
    observations: [],
    universe: [] as unknown as MarketTickerReadModel['universe'],
    fallbackProvider: null,
    sourceSummary: 'Ticker snapshot is temporarily unavailable.',
  };
}

export async function getMarketTickerData(
  locale: Locale,
  messages: Pick<AppMessages, 'common' | 'shell' | 'status' | 'ticker'>,
): Promise<MarketTickerViewModel> {
  const readModel = await withTimeout(
    getMarketTickerReadModel(),
    TICKER_TIMEOUT_MS,
    buildEmptyReadModel(),
  );
  const snapshot = mapMarketTicker(readModel, messages);
  return mapMarketTickerViewModel(snapshot, locale, messages);
}
