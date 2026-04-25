import { getAnalysisReadModelCached, type AnalysisReadModel } from './analysis-query';

export async function getDashboardMarketReadModel(): Promise<AnalysisReadModel> {
  return getAnalysisReadModelCached();
}
