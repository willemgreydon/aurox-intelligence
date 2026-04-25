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
import { getStocksReadModelCached, type StocksReadModelOptions } from '../queries/stocks-query';
import { perfLog, perfNow } from '../lib/perf';

export type StocksOverviewOptions = StocksReadModelOptions;

export async function getStocksOverviewData(
  locale?: Locale,
  messages?: AppMessages,
  options?: StocksOverviewOptions,
): Promise<StocksOverviewViewModel> {
  const t0 = perfNow();
  const readModel = await getStocksReadModelCached(
    typeof options?.symbolLimit === 'number' ? options.symbolLimit : null,
    options?.pageContext?.trim() || 'stocks',
  );
  perfLog('stocks-service:query', t0);
  const tMapper = perfNow();
  const snapshot = mapStocksOverview(readModel, locale, messages);
  const viewModel = mapStocksOverviewViewModel(snapshot, locale, messages);
  perfLog('stocks-service:mapper', tMapper);
  perfLog('stocks-service:total', t0);
  return viewModel;
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
