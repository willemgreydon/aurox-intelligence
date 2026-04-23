import { createDatabaseClient } from '../client';
import { assetsTable } from '../schema/assets';
import { forecastsTable } from '../schema/forecasts';
import { ingestionRunsTable } from '../schema/ingestion-runs';
import { observationsTable } from '../schema/observations';
import { providerSyncTable } from '../schema/provider-sync';

type AssetClass = 'stock' | 'fx';

type CountRow = {
  count: number | string;
};

type TimestampRow = {
  timestamp: string | null;
};

type ForecastRow = {
  assetId: string;
  symbol: string;
  assetName: string;
  assetClass: AssetClass;
  horizon: 'short' | 'medium' | 'long';
  directionalBias: 'bullish' | 'bearish' | 'neutral';
  confidenceScore: number;
  scenarioSummary: string;
  riskSummary: string | null;
  producedAt: string;
};

type IngestionRunRow = {
  id: string;
  source: string;
  status: 'pending' | 'running' | 'succeeded' | 'failed';
  startedAt: string;
  completedAt: string | null;
};

type ProviderSyncRow = {
  source: string;
  status: 'ok' | 'warning' | 'failed';
  syncedAt: string | null;
  detail: string | null;
};

export type DashboardDataSourceState = {
  configured: boolean;
  mode: 'unconfigured' | 'stub' | 'postgres';
};

export type DashboardOperationalReadModel = {
  dataSource: DashboardDataSourceState;
  assetCount: number;
  latestObservationAt: string | null;
  latestForecastAt: string | null;
  latestIngestionCompletedAt: string | null;
  latestSuccessfulSyncAt: string | null;
  forecasts: ForecastRow[];
  ingestionRuns: IngestionRunRow[];
  providerSyncs: ProviderSyncRow[];
};

function buildEmptyDashboardReadModel(dataSource: DashboardDataSourceState): DashboardOperationalReadModel {
  return {
    dataSource,
    assetCount: 0,
    latestObservationAt: null,
    latestForecastAt: null,
    latestIngestionCompletedAt: null,
    latestSuccessfulSyncAt: null,
    forecasts: [],
    ingestionRuns: [],
    providerSyncs: [],
  };
}

function isMissingOperationalSchemaError(error: unknown) {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return false;
  }

  const databaseError = error as { code?: string };
  return databaseError.code === '42P01' || databaseError.code === '42703';
}

function parseCount(value: number | string | undefined): number {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

export async function getDashboardReadModel(): Promise<DashboardOperationalReadModel> {
  const client = createDatabaseClient();

  if (!client.isConfigured) {
    return buildEmptyDashboardReadModel({
      configured: false,
      mode: client.mode,
    });
  }

  let assetCountRows: CountRow[];
  let latestObservationRows: TimestampRow[];
  let latestForecastRows: TimestampRow[];
  let latestIngestionRows: TimestampRow[];
  let latestSuccessfulSyncRows: TimestampRow[];
  let forecastRows: ForecastRow[];
  let ingestionRunRows: IngestionRunRow[];
  let providerSyncRows: ProviderSyncRow[];

  try {
    [
      assetCountRows,
      latestObservationRows,
      latestForecastRows,
      latestIngestionRows,
      latestSuccessfulSyncRows,
      forecastRows,
      ingestionRunRows,
      providerSyncRows,
    ] = await Promise.all([
      client.query<CountRow>(`select count(*) as count from ${assetsTable}`),
      client.query<TimestampRow>(`select max(observed_at) as timestamp from ${observationsTable}`),
      client.query<TimestampRow>(`select max(produced_at) as timestamp from ${forecastsTable}`),
      client.query<TimestampRow>(
        `select max(completed_at) as timestamp from ${ingestionRunsTable} where status = 'succeeded'`,
      ),
      client.query<TimestampRow>(
        `select max(synced_at) as timestamp from ${providerSyncTable} where status = 'ok'`,
      ),
      client.query<ForecastRow>(`
        select
          f.asset_id as assetId,
          a.symbol as symbol,
          a.name as assetName,
          a.asset_class as assetClass,
          f.horizon as horizon,
          f.directional_bias as directionalBias,
          f.confidence_score as confidenceScore,
          f.scenario_summary as scenarioSummary,
          null as riskSummary,
          f.produced_at as producedAt
        from ${forecastsTable} f
        join ${assetsTable} a on a.id = f.asset_id
        order by f.produced_at desc
        limit 6
      `),
      client.query<IngestionRunRow>(`
        select
          id,
          source,
          status,
          started_at as startedAt,
          completed_at as completedAt
        from ${ingestionRunsTable}
        order by started_at desc
        limit 5
      `),
      client.query<ProviderSyncRow>(`
        select
          source,
          status,
          synced_at as syncedAt,
          detail
        from ${providerSyncTable}
        order by synced_at desc
        limit 5
      `),
    ]);
  } catch (error) {
    if (isMissingOperationalSchemaError(error)) {
      return buildEmptyDashboardReadModel({
        configured: false,
        mode: client.mode,
      });
    }

    throw error;
  }

  return {
    dataSource: {
      configured: true,
      mode: client.mode,
    },
    assetCount: parseCount(assetCountRows[0]?.count),
    latestObservationAt: latestObservationRows[0]?.timestamp ?? null,
    latestForecastAt: latestForecastRows[0]?.timestamp ?? null,
    latestIngestionCompletedAt: latestIngestionRows[0]?.timestamp ?? null,
    latestSuccessfulSyncAt: latestSuccessfulSyncRows[0]?.timestamp ?? null,
    forecasts: forecastRows,
    ingestionRuns: ingestionRunRows,
    providerSyncs: providerSyncRows,
  };
}
