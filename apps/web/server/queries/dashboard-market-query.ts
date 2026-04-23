import { getAnalysisReadModel, type AnalysisReadModel } from './analysis-query';

export async function getDashboardMarketReadModel(): Promise<AnalysisReadModel> {
  return getAnalysisReadModel();
}
