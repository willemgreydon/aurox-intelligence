import type { Locale } from '@repo/api-contracts';
import type { AppMessages } from '../../lib/i18n/messages';
import { mapInvestOverview, mapInvestOverviewViewModel, type InvestOverviewViewModel } from '../mappers/invest-mapper';
import { getInvestReadModel } from '../queries/invest-query';

export async function getInvestOverviewData(
  locale: Locale = 'en',
  messages?: AppMessages,
): Promise<InvestOverviewViewModel> {
  const readModel = await getInvestReadModel();
  const snapshot = mapInvestOverview(readModel);
  return mapInvestOverviewViewModel(
    snapshot,
    locale,
    messages,
    readModel.historySeriesBySymbol,
    readModel.provider,
    readModel.providerError,
    readModel.observations.length,
    readModel.assets.length,
  );
}
