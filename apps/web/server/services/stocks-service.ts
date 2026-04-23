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
import { getStocksReadModel } from '../queries/stocks-query';

export async function getStocksOverviewData(
  locale?: Locale,
  messages?: AppMessages,
): Promise<StocksOverviewViewModel> {
  const readModel = await getStocksReadModel();
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
