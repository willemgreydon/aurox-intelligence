import type { Locale } from '@repo/api-contracts';
import type { AppMessages } from '../../lib/i18n/messages';
import {
  mapStockDetail,
  mapStockDetailViewModel,
  mapStocksOverview,
  mapStocksOverviewViewModel,
  type StockDetailViewModel,
  type StocksOverviewViewModel,
} from '../mappers/stocks-mapper';
import { getStockDetailReadModel } from '../queries/stock-detail-query';
import { getStocksReadModel, type StocksReadModelOptions } from '../queries/stocks-query';

export type StocksOverviewOptions = StocksReadModelOptions;

export async function getStocksOverviewData(
  locale?: Locale,
  messages?: AppMessages,
  options?: StocksOverviewOptions,
): Promise<StocksOverviewViewModel> {
  const readModel = await getStocksReadModel(options);
  const snapshot = mapStocksOverview(readModel, locale, messages);
  return mapStocksOverviewViewModel(snapshot, locale, messages);
}

export async function getStockDetailData(
  symbol: string,
  locale?: Locale,
  messages?: AppMessages,
): Promise<StockDetailViewModel> {
  const readModel = await getStockDetailReadModel(symbol);
  const snapshot = mapStockDetail(readModel, locale, messages);
  return mapStockDetailViewModel(snapshot, locale, messages);
}
