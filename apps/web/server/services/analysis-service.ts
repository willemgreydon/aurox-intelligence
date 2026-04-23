import { mapForecastsPage, mapSignalsPage, type ForecastsPageViewModel, type SignalsPageViewModel } from '../mappers/analysis-mapper';
import { getAnalysisReadModel } from '../queries/analysis-query';

export async function getSignalsPageData(): Promise<SignalsPageViewModel> {
  const readModel = await getAnalysisReadModel();
  return mapSignalsPage(readModel);
}

export async function getForecastsPageData(): Promise<ForecastsPageViewModel> {
  const readModel = await getAnalysisReadModel();
  return mapForecastsPage(readModel);
}
