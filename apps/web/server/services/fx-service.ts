import {
  mapFxDetail,
  mapFxDetailViewModel,
  mapFxOverview,
  mapFxOverviewViewModel,
  type FxDetailViewModel,
  type FxOverviewViewModel,
} from '../mappers/fx-mapper';
import { getFxDetailReadModel } from '../queries/fx-detail-query';
import { getFxReadModel } from '../queries/fx-query';

export async function getFxOverviewData(): Promise<FxOverviewViewModel> {
  const readModel = await getFxReadModel();
  const snapshot = mapFxOverview(readModel);
  return mapFxOverviewViewModel(snapshot);
}

export async function getFxDetailData(pair: string): Promise<FxDetailViewModel> {
  const readModel = await getFxDetailReadModel(pair);
  const snapshot = mapFxDetail(readModel);
  return mapFxDetailViewModel(snapshot);
}
