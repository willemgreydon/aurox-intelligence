import type { AdminMonitoring } from '@repo/api-contracts';
import type { AdminReadModel, ProviderCheck } from '../queries/admin-query';
import { mapOptionalTimestamp, mapRouteStatusLabel, mapRouteStatusTone, type RouteStatus } from './route-presentation';

export type AdminOperationalMetrics = {
  assetCount: number;
  latestObservationLabel: string;
  latestForecastLabel: string;
  latestIngestionLabel: string;
  latestSyncLabel: string;
  ingestionRunCount: number;
  providerSyncCount: number;
  forecastCount: number;
  activeProvider: string;
  configuredProviderCount: number;
  totalProviderCount: number;
};

export type AdminMonitoringViewModel = Omit<AdminMonitoring, 'providers' | 'pipelines' | 'warnings'> & {
  statusLabel: string;
  statusTone: ReturnType<typeof mapRouteStatusTone>;
  lastUpdatedLabel: string;
  operationalMetrics: AdminOperationalMetrics;
  providers: Array<
    ProviderCheck & {
      statusLabel: string;
      statusTone: ReturnType<typeof mapRouteStatusTone>;
      lastCheckedLabel: string;
    }
  >;
  pipelines: Array<
    AdminMonitoring['pipelines'][number] & {
      statusLabel: string;
      statusTone: ReturnType<typeof mapRouteStatusTone>;
      lastUpdatedLabel: string;
    }
  >;
  warnings: Array<
    AdminMonitoring['warnings'][number] & {
      severityLabel: string;
      severityTone: ReturnType<typeof mapRouteStatusTone>;
    }
  >;
};

function deriveAdminStatus(readModel: AdminReadModel): RouteStatus {
  if (readModel.providerChecks.some((item) => item.status === 'degraded')) {
    return 'degraded';
  }

  if (readModel.providerChecks.some((item) => item.status === 'attention') || !readModel.dashboard.dataSource.configured) {
    return 'attention';
  }

  return 'nominal';
}

function mapOperationalMetrics(readModel: AdminReadModel): AdminOperationalMetrics {
  const { dashboard, activeProvider, providerChecks } = readModel;
  return {
    assetCount: dashboard.assetCount,
    latestObservationLabel: mapOptionalTimestamp(dashboard.latestObservationAt).absolute,
    latestForecastLabel: mapOptionalTimestamp(dashboard.latestForecastAt).absolute,
    latestIngestionLabel: mapOptionalTimestamp(dashboard.latestIngestionCompletedAt).absolute,
    latestSyncLabel: mapOptionalTimestamp(dashboard.latestSuccessfulSyncAt).absolute,
    ingestionRunCount: dashboard.ingestionRuns.length,
    providerSyncCount: dashboard.providerSyncs.length,
    forecastCount: dashboard.forecasts.length,
    activeProvider,
    configuredProviderCount: providerChecks.filter((p) => p.configured).length,
    totalProviderCount: providerChecks.length,
  };
}

export function mapAdminMonitoring(readModel: AdminReadModel): AdminMonitoring {
  const lastUpdated = [
    readModel.dashboard.latestIngestionCompletedAt,
    readModel.dashboard.latestSuccessfulSyncAt,
    ...readModel.providerChecks.map((item) => item.lastChecked),
  ]
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1) ?? null;

  return {
    title: 'Admin Operations Console',
    description: 'Internal monitoring surface for provider readiness, ingestion state, forecast refresh visibility, and operational warnings.',
    status: deriveAdminStatus(readModel),
    lastUpdated,
    freshnessSummary: readModel.dashboard.dataSource.configured
      ? 'Persistence-aware monitoring is active; provider checks and pipeline summaries are shown together in one console.'
      : 'Admin monitoring is live, but persistence remains unconfigured so several operational checks are partial.',
    providers: readModel.providerChecks,
    pipelines: [
      {
        id: 'ingestion',
        label: 'Ingestion runs',
        status: readModel.dashboard.ingestionRuns.some((item) => item.status === 'failed')
          ? 'degraded'
          : readModel.dashboard.ingestionRuns.length > 0
            ? 'nominal'
            : 'attention',
        summary: readModel.dashboard.ingestionRuns.length > 0
          ? `Latest persisted ingestion window includes ${readModel.dashboard.ingestionRuns.length} runs.`
          : 'No persisted ingestion runs are currently available.',
        lastUpdated: readModel.dashboard.latestIngestionCompletedAt,
      },
      {
        id: 'provider-sync',
        label: 'Provider sync',
        status: readModel.dashboard.providerSyncs.some((item) => item.status === 'failed')
          ? 'degraded'
          : readModel.dashboard.providerSyncs.length > 0
            ? 'nominal'
            : 'attention',
        summary: readModel.dashboard.providerSyncs.length > 0
          ? `${readModel.dashboard.providerSyncs.length} provider sync summaries are available in persistence.`
          : 'No persisted provider sync summaries are currently available.',
        lastUpdated: readModel.dashboard.latestSuccessfulSyncAt,
      },
      {
        id: 'forecast-refresh',
        label: 'Forecast refresh',
        status: readModel.dashboard.latestForecastAt ? 'nominal' : 'attention',
        summary: readModel.dashboard.latestForecastAt
          ? `Forecast refresh state is backed by ${readModel.dashboard.forecasts.length} persisted preview rows.`
          : 'No persisted forecast refresh timestamp is currently available.',
        lastUpdated: readModel.dashboard.latestForecastAt,
      },
    ],
    warnings: [
      ...(readModel.dashboard.dataSource.configured
        ? []
        : [
            {
              id: 'db-unconfigured',
              title: 'Persistence is not configured',
              detail: 'DATABASE_URL is not set, so repository-backed admin monitoring remains partial.',
              severity: 'degraded' as const,
            },
          ]),
      ...readModel.providerChecks
        .filter((item) => item.status !== 'nominal')
        .map((item) => ({
          id: `provider-${item.id}`,
          title: `${item.name} requires attention`,
          detail: item.detail,
          severity: item.status,
        })),
    ],
    notes: [
      'This surface is intended to grow into a real internal monitoring console rather than a decorative admin page.',
      'Provider checks stay behind the query layer and are never called directly from route components.',
      'Pipeline summaries combine provider readiness and repository-backed dashboard state in one view.',
    ],
  };
}

export function mapAdminMonitoringViewModel(snapshot: AdminMonitoring, readModel: AdminReadModel): AdminMonitoringViewModel {
  return {
    ...snapshot,
    statusLabel: mapRouteStatusLabel(snapshot.status),
    statusTone: mapRouteStatusTone(snapshot.status),
    lastUpdatedLabel: mapOptionalTimestamp(snapshot.lastUpdated).absolute,
    operationalMetrics: mapOperationalMetrics(readModel),
    providers: readModel.providerChecks.map((provider) => ({
      ...provider,
      statusLabel: mapRouteStatusLabel(provider.status),
      statusTone: mapRouteStatusTone(provider.status),
      lastCheckedLabel: mapOptionalTimestamp(provider.lastChecked).absolute,
    })),
    pipelines: snapshot.pipelines.map((pipeline) => ({
      ...pipeline,
      statusLabel: mapRouteStatusLabel(pipeline.status),
      statusTone: mapRouteStatusTone(pipeline.status),
      lastUpdatedLabel: mapOptionalTimestamp(pipeline.lastUpdated).absolute,
    })),
    warnings: snapshot.warnings.map((warning) => ({
      ...warning,
      severityLabel: mapRouteStatusLabel(warning.severity),
      severityTone: mapRouteStatusTone(warning.severity),
    })),
  } satisfies AdminMonitoringViewModel;
}
