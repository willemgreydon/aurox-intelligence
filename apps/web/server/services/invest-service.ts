import type { Locale } from '@repo/api-contracts';
import type { AppMessages } from '../../lib/i18n/messages';
import { mapInvestOverview, mapInvestOverviewViewModel, type InvestOverviewViewModel } from '../mappers/invest-mapper';
import { perfLog, perfNow } from '../lib/perf';
import { getInvestReadModelCached, type InvestReadModelOptions } from '../queries/invest-query';

export async function getInvestOverviewData(
  locale: Locale = 'en',
  messages?: AppMessages,
  options: InvestReadModelOptions = {},
): Promise<InvestOverviewViewModel> {
  const t0 = perfNow();
  const readModel = await getInvestReadModelCached(
    typeof options.quoteSymbolLimit === 'number' ? options.quoteSymbolLimit : null,
    typeof options.historySymbolLimit === 'number' ? options.historySymbolLimit : null,
    options.includeHistory ?? true,
    (options.preferredSymbols ?? []).join(','),
    options.pageContext?.trim() || 'invest',
    options.assetClassFilter ?? null,
    typeof options.page === 'number' ? options.page : null,
    typeof options.pageSize === 'number' ? options.pageSize : null,
  );
  perfLog('invest-service:query', t0);
  const tMapper = perfNow();
  const snapshot = mapInvestOverview(readModel);
  const viewModel = mapInvestOverviewViewModel(
    snapshot,
    locale,
    messages,
    readModel.historySeriesBySymbol,
    readModel.provider,
    readModel.providerError,
    readModel.observations.length,
    readModel.assets.length,
    readModel.page,
    readModel.pageSize,
    readModel.totalAssets,
    readModel.hasNextPage,
    readModel.hasPreviousPage,
  );
  perfLog('invest-service:mapper', tMapper);
  perfLog('invest-service:total', t0);
  return viewModel;
}
