import type {
  DashboardForecastPreview,
  DashboardMetricTone,
  DashboardModule,
  DashboardSnapshot,
  DashboardStatus,
  DashboardSystemStatus,
} from '@repo/api-contracts';
import type { DashboardOperationalReadModel } from '@repo/db';
import { formatOptionalDateTimeLabel, formatRelativeTimeLabel } from '../../lib/formatters';

export type DashboardStatusTone = 'success' | 'warning' | 'danger' | 'info';

export type DashboardViewModel = {
  overview: DashboardSnapshot['overview'] & {
    statusLabel: string;
    statusTone: DashboardStatusTone;
    lastUpdatedLabel: string;
    freshnessLabel: string;
  };
  metrics: Array<
    DashboardSnapshot['metrics'][number] & {
      statusTone: DashboardStatusTone;
    }
  >;
  forecastOverview: {
    title: string;
    description: string;
    items: Array<
      DashboardForecastPreview & {
        biasTone: DashboardStatusTone;
        biasLabel: string;
        producedAtLabel: string;
      }
    >;
  };
  modules: Array<
    DashboardModule & {
      statusTone: DashboardStatusTone;
      statusLabel: string;
      ownerAreaLabel: string;
    }
  >;
  methodology: DashboardSnapshot['methodology'];
  systemStatuses: Array<
    DashboardSystemStatus & {
      statusTone: DashboardStatusTone;
      statusLabel: string;
      lastUpdatedLabel: string;
    }
  >;
  readinessNotes: DashboardSnapshot['readinessNotes'];
};

function minutesAgo(value: string | null, now = new Date()): number | null {
  if (!value) {
    return null;
  }

  const diff = now.getTime() - new Date(value).getTime();
  return Math.max(0, Math.round(diff / 60000));
}

function maxTimestamp(...values: Array<string | null>): string | null {
  const timestamps = values.filter((value): value is string => Boolean(value));

  if (timestamps.length === 0) {
    return null;
  }

  return timestamps.reduce((latest, current) =>
    new Date(current).getTime() > new Date(latest).getTime() ? current : latest,
  );
}

function mapStatusTone(status: DashboardStatus): DashboardStatusTone {
  if (status === 'nominal') {
    return 'success';
  }

  if (status === 'attention') {
    return 'warning';
  }

  return 'danger';
}

function mapStatusLabel(status: DashboardStatus): string {
  if (status === 'nominal') {
    return 'Nominal';
  }

  if (status === 'attention') {
    return 'Attention';
  }

  return 'Degraded';
}

function mapMetricTone(tone: DashboardMetricTone): DashboardStatusTone {
  if (tone === 'positive') {
    return 'success';
  }

  if (tone === 'warning') {
    return 'warning';
  }

  if (tone === 'negative') {
    return 'danger';
  }

  return 'info';
}

function mapBiasTone(bias: DashboardForecastPreview['directionalBias']): DashboardStatusTone {
  if (bias === 'bullish') {
    return 'success';
  }

  if (bias === 'bearish') {
    return 'danger';
  }

  return 'info';
}

function mapOwnerAreaLabel(ownerArea: DashboardModule['ownerArea']): string {
  if (ownerArea === 'markets') {
    return 'Market intelligence';
  }

  if (ownerArea === 'analytics') {
    return 'Analytics layer';
  }

  return 'Platform operations';
}

function confidenceLabel(score: number): string {
  if (score >= 0.8) {
    return 'High confidence';
  }

  if (score >= 0.6) {
    return 'Moderate confidence';
  }

  return 'Cautious confidence';
}

function titleCaseBias(bias: DashboardForecastPreview['directionalBias']): string {
  return `${bias.slice(0, 1).toUpperCase()}${bias.slice(1)}`;
}

function deriveOverallStatus(readModel: DashboardOperationalReadModel): DashboardStatus {
  if (!readModel.dataSource.configured) {
    return 'attention';
  }

  const failedRuns = readModel.ingestionRuns.filter((run) => run.status === 'failed').length;
  const failedSyncs = readModel.providerSyncs.filter((sync) => sync.status === 'failed').length;

  if (failedRuns > 0 || failedSyncs > 0) {
    return 'degraded';
  }

  if (readModel.forecasts.length === 0 || readModel.latestObservationAt === null) {
    return 'attention';
  }

  return 'nominal';
}

function deriveFreshnessSummary(readModel: DashboardOperationalReadModel): string {
  if (!readModel.dataSource.configured) {
    return 'No database connection is configured yet, so dashboard widgets are showing truthful empty-state operational scaffolding.';
  }

  const freshestTimestamp = maxTimestamp(
    readModel.latestObservationAt,
    readModel.latestForecastAt,
    readModel.latestIngestionCompletedAt,
  );

  if (!freshestTimestamp) {
    return 'Persistence is configured, but no market observations, forecasts, or ingestion runs are currently available to summarize.';
  }

  const freshestMinutes = minutesAgo(freshestTimestamp);

  if (freshestMinutes !== null && freshestMinutes <= 15) {
    return 'Repository reads are active and the latest persisted operational timestamp is within the target monitoring window.';
  }

  return 'Repository reads are active, but the latest persisted operational timestamp is aging beyond the preferred monitoring window.';
}

function deriveIngestionHealthTone(readModel: DashboardOperationalReadModel): DashboardMetricTone {
  if (!readModel.dataSource.configured) {
    return 'warning';
  }

  if (readModel.ingestionRuns.some((run) => run.status === 'failed')) {
    return 'negative';
  }

  if (readModel.ingestionRuns.some((run) => run.status === 'running' || run.status === 'pending')) {
    return 'warning';
  }

  return readModel.ingestionRuns.length > 0 ? 'positive' : 'neutral';
}

function deriveIngestionHealthValue(readModel: DashboardOperationalReadModel): string {
  if (!readModel.dataSource.configured) {
    return 'Unavailable';
  }

  if (readModel.ingestionRuns.length === 0) {
    return 'No runs';
  }

  const successfulRuns = readModel.ingestionRuns.filter((run) => run.status === 'succeeded').length;
  return `${Math.round((successfulRuns / readModel.ingestionRuns.length) * 100)}%`;
}

function deriveIngestionHealthContext(readModel: DashboardOperationalReadModel): string {
  if (!readModel.dataSource.configured) {
    return 'Set DATABASE_URL and wire a concrete DB adapter in @repo/db to activate repository-backed ingestion health reads.';
  }

  if (readModel.ingestionRuns.length === 0) {
    return 'The repository is reachable, but there are no persisted ingestion runs available yet.';
  }

  const latestRun = readModel.ingestionRuns[0];
  if (!latestRun) {
    return 'The repository is reachable, but the latest ingestion run could not be resolved safely.';
  }

  return `Latest persisted run: ${latestRun.source} is ${latestRun.status}.`;
}

function deriveBiasMix(readModel: DashboardOperationalReadModel): { value: string; tone: DashboardMetricTone; context: string } {
  if (readModel.forecasts.length === 0) {
    return {
      value: 'No data',
      tone: readModel.dataSource.configured ? 'neutral' : 'warning',
      context: readModel.dataSource.configured
        ? 'No persisted forecast previews are available yet.'
        : 'Forecast preview counts remain unavailable until persistence is connected.',
    };
  }

  const bullish = readModel.forecasts.filter((forecast) => forecast.directionalBias === 'bullish').length;
  const neutral = readModel.forecasts.filter((forecast) => forecast.directionalBias === 'neutral').length;
  const bearish = readModel.forecasts.filter((forecast) => forecast.directionalBias === 'bearish').length;

  return {
    value: `${bullish} / ${neutral} / ${bearish}`,
    tone: 'neutral',
    context: 'Bullish, neutral, and bearish counts across the latest persisted forecast preview set.',
  };
}

function deriveConfidenceDistribution(
  readModel: DashboardOperationalReadModel,
): { value: string; tone: DashboardMetricTone; context: string } {
  if (readModel.forecasts.length === 0) {
    return {
      value: 'No data',
      tone: readModel.dataSource.configured ? 'neutral' : 'warning',
      context: readModel.dataSource.configured
        ? 'Confidence distribution will appear once forecast rows are persisted.'
        : 'Confidence distribution depends on repository-backed forecast rows.',
    };
  }

  const mediumOrHigher = readModel.forecasts.filter((forecast) => forecast.confidenceScore >= 0.6).length;
  const ratio = Math.round((mediumOrHigher / readModel.forecasts.length) * 100);

  return {
    value: `${ratio}% medium+`,
    tone: 'neutral',
    context: 'Share of persisted forecast previews with confidence scores at or above the medium threshold.',
  };
}

function mapSystemStatus(readModel: DashboardOperationalReadModel): DashboardSnapshot['systemStatuses'] {
  const failedSyncs = readModel.providerSyncs.filter((sync) => sync.status === 'failed').length;
  const warningSyncs = readModel.providerSyncs.filter((sync) => sync.status === 'warning').length;
  const failedRuns = readModel.ingestionRuns.filter((run) => run.status === 'failed').length;

  return [
    {
      id: 'status-ingestion',
      name: 'Ingestion pipeline',
      status: !readModel.dataSource.configured
        ? 'attention'
        : failedRuns > 0
          ? 'degraded'
          : readModel.latestIngestionCompletedAt
            ? 'nominal'
            : 'attention',
      summary: !readModel.dataSource.configured
        ? 'The ingestion status panel is ready, but persistence is not configured yet.'
        : readModel.latestIngestionCompletedAt
          ? 'Ingestion status is sourced from the latest persisted run records.'
          : 'The repository is configured, but there are no completed ingestion runs to summarize yet.',
      detail: !readModel.dataSource.configured
        ? 'Configure DATABASE_URL and a concrete database adapter in packages/db to activate this panel.'
        : failedRuns > 0
          ? 'One or more persisted ingestion runs are in a failed state and require operator review.'
          : 'No failed ingestion runs are currently visible in the persisted run window.',
      lastUpdated: readModel.latestIngestionCompletedAt,
    },
    {
      id: 'status-provider-sync',
      name: 'Provider synchronization',
      status: !readModel.dataSource.configured
        ? 'attention'
        : failedSyncs > 0
          ? 'degraded'
          : warningSyncs > 0
            ? 'attention'
            : readModel.latestSuccessfulSyncAt
              ? 'nominal'
              : 'attention',
      summary: !readModel.dataSource.configured
        ? 'Provider sync state cannot be derived until persistence is connected.'
        : readModel.providerSyncs.length > 0
          ? 'Provider synchronization status is derived from persisted sync summaries.'
          : 'No provider sync summaries are persisted yet.',
      detail: !readModel.dataSource.configured
        ? 'This panel is intentionally partial until provider sync rows become queryable.'
        : failedSyncs > 0
          ? 'At least one provider sync row is marked failed in the latest persisted sample.'
          : warningSyncs > 0
            ? 'One or more provider sync rows are marked warning and should be reviewed.'
            : 'No provider sync failures are visible in the latest persisted sample.',
      lastUpdated: readModel.latestSuccessfulSyncAt,
    },
    {
      id: 'status-forecast-refresh',
      name: 'Forecast refresh',
      status: !readModel.dataSource.configured
        ? 'attention'
        : readModel.latestForecastAt
          ? 'nominal'
          : 'attention',
      summary: !readModel.dataSource.configured
        ? 'Forecast refresh timing is unavailable because repository persistence is not configured.'
        : readModel.latestForecastAt
          ? 'Forecast preview timing is sourced from persisted forecast output rows.'
          : 'No persisted forecast previews are available yet.',
      detail: !readModel.dataSource.configured
        ? 'The forecast area will switch to live timing once forecast rows can be read from packages/db.'
        : readModel.forecasts.length > 0
          ? `The dashboard is currently reading ${readModel.forecasts.length} persisted forecast preview rows.`
          : 'Forecast cards are empty because no persisted forecast rows were returned.',
      lastUpdated: readModel.latestForecastAt,
    },
    {
      id: 'status-persistence',
      name: 'Persistence readiness',
      status: readModel.dataSource.configured ? 'attention' : 'degraded',
      summary: readModel.dataSource.configured
        ? 'A database URL is configured, but @repo/db is still running through a stub adapter.'
        : 'No database URL is configured, so repository reads are intentionally unavailable.',
      detail: readModel.dataSource.configured
        ? 'Query wiring is in place, but a concrete adapter must replace the current stub client for true live dashboard data.'
        : 'Connect DATABASE_URL and implement the concrete DB client to unlock observation, forecast, and sync reads.',
      lastUpdated: null,
    },
  ];
}

function mapModules(readModel: DashboardOperationalReadModel): DashboardSnapshot['modules'] {
  return [
    {
      id: 'module-stocks',
      title: 'Stocks',
      description: 'Equity trend monitoring and repository-backed asset universe access.',
      href: '/stocks',
      ownerArea: 'markets',
      status: readModel.assetCount > 0 ? 'nominal' : 'attention',
    },
    {
      id: 'module-fx',
      title: 'FX',
      description: 'Currency value analysis entry point that will consume the same persisted asset universe.',
      href: '/fx',
      ownerArea: 'markets',
      status: readModel.assetCount > 0 ? 'nominal' : 'attention',
    },
    {
      id: 'module-signals',
      title: 'Signals',
      description: 'Signal registry framing remains in place while repository-backed signal reads are still pending.',
      href: '/dashboard',
      ownerArea: 'analytics',
      status: 'attention',
    },
    {
      id: 'module-forecasts',
      title: 'Forecasts',
      description: 'Forecast preview cards now consume persisted rows when they are available.',
      href: '/dashboard',
      ownerArea: 'analytics',
      status: readModel.forecasts.length > 0 ? 'nominal' : 'attention',
    },
    {
      id: 'module-ingestion',
      title: 'Ingestion',
      description: 'Source freshness and run health are derived from persisted ingestion and provider sync summaries.',
      href: '/admin',
      ownerArea: 'operations',
      status: readModel.latestIngestionCompletedAt ? 'nominal' : 'attention',
    },
    {
      id: 'module-admin',
      title: 'Admin / Monitoring',
      description: 'Operational diagnostics reflect actual repository availability instead of decorative placeholders.',
      href: '/admin',
      ownerArea: 'operations',
      status: readModel.dataSource.configured ? 'attention' : 'degraded',
    },
  ];
}

export function mapDashboardSnapshot(readModel: DashboardOperationalReadModel): DashboardSnapshot {
  const overallStatus = deriveOverallStatus(readModel);
  const latestTimestamp = maxTimestamp(
    readModel.latestObservationAt,
    readModel.latestForecastAt,
    readModel.latestIngestionCompletedAt,
    readModel.latestSuccessfulSyncAt,
  );
  const biasMix = deriveBiasMix(readModel);
  const confidenceDistribution = deriveConfidenceDistribution(readModel);

  return {
    overview: {
      title: 'Market Intelligence Dashboard',
      description:
        'Operational overview for forecast posture, data freshness, and analyst-facing readiness across stocks, FX, and platform systems.',
      overallStatus,
      lastUpdated: latestTimestamp,
      freshnessSummary: deriveFreshnessSummary(readModel),
      callToActions: [
        { label: 'Stocks', href: '/stocks' },
        { label: 'FX', href: '/fx' },
        { label: 'Forecasts', href: '/dashboard' },
        { label: 'Admin', href: '/admin' },
      ],
    },
    metrics: [
      {
        id: 'tracked-assets',
        label: 'Tracked assets',
        value: String(readModel.assetCount),
        context: readModel.dataSource.configured
          ? 'Count of persisted assets currently available through the repository layer.'
          : 'The asset repository is ready, but persistence is not configured yet.',
        tone: readModel.assetCount > 0 ? 'positive' : readModel.dataSource.configured ? 'neutral' : 'warning',
      },
      {
        id: 'active-forecasts',
        label: 'Active forecast surfaces',
        value: String(readModel.forecasts.length),
        context: readModel.dataSource.configured
          ? 'Forecast preview rows returned from the repository-backed dashboard read query.'
          : 'Forecast rows will appear here once persistence is configured and connected.',
        tone: readModel.forecasts.length > 0 ? 'positive' : readModel.dataSource.configured ? 'neutral' : 'warning',
      },
      {
        id: 'refresh-window',
        label: 'Latest refresh window',
        value: formatRelativeTimeLabel(latestTimestamp),
        context: latestTimestamp
          ? 'Derived from the freshest persisted observation, forecast, ingestion, or provider sync timestamp.'
          : 'No persisted operational timestamps are available yet.',
        tone: latestTimestamp ? 'positive' : readModel.dataSource.configured ? 'neutral' : 'warning',
      },
      {
        id: 'ingestion-health',
        label: 'Ingestion health',
        value: deriveIngestionHealthValue(readModel),
        context: deriveIngestionHealthContext(readModel),
        tone: deriveIngestionHealthTone(readModel),
      },
      {
        id: 'bias-split',
        label: 'Bias mix',
        value: biasMix.value,
        context: biasMix.context,
        tone: biasMix.tone,
      },
      {
        id: 'confidence-distribution',
        label: 'Confidence distribution',
        value: confidenceDistribution.value,
        context: confidenceDistribution.context,
        tone: confidenceDistribution.tone,
      },
    ],
    forecastOverview: {
      title: 'Forecast overview',
      description: readModel.dataSource.configured
        ? 'Forecast cards are sourced from persisted repository rows when available and stay empty when the database returns no current previews.'
        : 'Forecast cards remain intentionally empty until repository persistence is configured.',
      items: readModel.forecasts.map((forecast) => ({
        assetId: forecast.assetId,
        symbol: forecast.symbol,
        assetName: forecast.assetName,
        assetClass: forecast.assetClass,
        horizon: forecast.horizon,
        directionalBias: forecast.directionalBias,
        confidenceLabel: confidenceLabel(forecast.confidenceScore),
        producedAt: forecast.producedAt,
        keyDriverSummary: forecast.scenarioSummary,
        riskSummary: forecast.riskSummary ?? 'No persisted risk summary is available for this forecast row yet.',
      })),
    },
    modules: mapModules(readModel),
    methodology: [
      {
        id: 'step-providers',
        title: 'Provider ingestion',
        description: 'External market and macro feeds are collected through provider adapters owned outside the UI.',
        boundary: 'packages/providers',
      },
      {
        id: 'step-canonicalization',
        title: 'Canonicalization',
        description: 'Incoming records are normalized into stable shapes before they enter downstream analytics.',
        boundary: 'packages/ingestion',
      },
      {
        id: 'step-persistence',
        title: 'Repository-backed reads',
        description: 'Dashboard data now enters the web app through packages/db and server-side read orchestration.',
        boundary: 'packages/db -> apps/web/server',
      },
      {
        id: 'step-forecasting',
        title: 'Forecast generation',
        description: 'Scenario-aware forecast outputs remain separate from the presentation layer and are read back as persisted rows.',
        boundary: 'packages/forecasting',
      },
      {
        id: 'step-explainability',
        title: 'Explainability output',
        description: 'Driver and risk text are shown only when persisted data actually provides them; otherwise the dashboard stays explicit about gaps.',
        boundary: 'apps/web + @repo/api-contracts',
      },
    ],
    systemStatuses: mapSystemStatus(readModel),
    readinessNotes: [
      readModel.dataSource.configured
        ? 'Repository query seams are now live, but the current database client is still a stub adapter and must be replaced for true data access.'
        : 'The dashboard is now honest about persistence being unavailable instead of presenting decorative fake operational values.',
      'Forecast preview cards consume only persisted read-model fields and intentionally avoid analytics logic in the UI.',
      'The existing query -> mapper -> service -> route layering remains intact, so real DB adapters can slot in without redesigning the dashboard surface.',
    ],
  };
}

export function mapDashboardViewModel(snapshot: DashboardSnapshot): DashboardViewModel {
  return {
    overview: {
      ...snapshot.overview,
      statusLabel: mapStatusLabel(snapshot.overview.overallStatus),
      statusTone: mapStatusTone(snapshot.overview.overallStatus),
      lastUpdatedLabel: formatOptionalDateTimeLabel(snapshot.overview.lastUpdated),
      freshnessLabel: formatRelativeTimeLabel(snapshot.overview.lastUpdated),
    },
    metrics: snapshot.metrics.map((metric) => ({
      ...metric,
      statusTone: mapMetricTone(metric.tone),
    })),
    forecastOverview: {
      ...snapshot.forecastOverview,
      items: snapshot.forecastOverview.items.map((item) => ({
        ...item,
        biasTone: mapBiasTone(item.directionalBias),
        biasLabel: titleCaseBias(item.directionalBias),
        producedAtLabel: formatOptionalDateTimeLabel(item.producedAt),
      })),
    },
    modules: snapshot.modules.map((module) => ({
      ...module,
      statusTone: mapStatusTone(module.status),
      statusLabel: mapStatusLabel(module.status),
      ownerAreaLabel: mapOwnerAreaLabel(module.ownerArea),
    })),
    methodology: snapshot.methodology,
    systemStatuses: snapshot.systemStatuses.map((status) => ({
      ...status,
      statusTone: mapStatusTone(status.status),
      statusLabel: mapStatusLabel(status.status),
      lastUpdatedLabel: formatRelativeTimeLabel(status.lastUpdated),
    })),
    readinessNotes: snapshot.readinessNotes,
  };
}
