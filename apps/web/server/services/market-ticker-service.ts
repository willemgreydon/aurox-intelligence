import type { Locale } from '@repo/api-contracts';
import type { AppMessages } from '../../lib/i18n/messages';
import { mapMarketTicker, mapMarketTickerViewModel, type MarketTickerViewModel } from '../mappers/market-ticker-mapper';
import { getMarketTickerReadModel } from '../queries/market-ticker-query';

export async function getMarketTickerData(
  locale: Locale,
  messages: Pick<AppMessages, 'common' | 'shell' | 'status' | 'ticker'>,
): Promise<MarketTickerViewModel> {
  const readModel = await getMarketTickerReadModel();
  const snapshot = mapMarketTicker(readModel, messages);
  return mapMarketTickerViewModel(snapshot, locale, messages);
}
