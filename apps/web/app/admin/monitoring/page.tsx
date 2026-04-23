import type { AdminMonitoringViewModel } from '../../../server/mappers/admin-mapper';
import type { TableColumn } from '../../../lib/dashboard/analytics-fixtures';
import { OperationalStatusCard } from '../../../components/admin/operational-status-card';
import { WarningsPanel } from '../../../components/admin/warnings-panel';
import { WorkstationPageHeader } from '../../../components/asset/workstation-page-header';
import { AnalyticsTable } from '../../../components/tables/analytics-table';
import { CompactStatCard } from '../../../components/stats/compact-stat-card';
import { Section } from '../../../components/ui/section';
import { getAdminMonitoringData } from '../../../server/services/admin-service';

export const dynamic = 'force-dynamic';

type ProviderRow = {
  provider: string;
  status: string;
  configured: string;
  category: string;
  lastChecked: string;
  detail: string;
};

type PipelineRow = {
  pipeline: string;
  status: string;
  lastUpdated: string;
  summary: string;
};

const providerColumns: Array<TableColumn<ProviderRow>> = [
  { key: 'provider', label: 'Provider' },
  { key: 'status', label: 'Status' },
  { key: 'configured', label: 'Configured' },
  { key: 'category', label: 'Category' },
  { key: 'lastChecked', label: 'Last checked', align: 'right' },
  { key: 'detail', label: 'Detail' },
];

const pipelineColumns: Array<TableColumn<PipelineRow>> = [
  { key: 'pipeline', label: 'Pipeline' },
  { key: 'status', label: 'Status' },
  { key: 'lastUpdated', label: 'Last updated', align: 'right' },
  { key: 'summary', label: 'Summary' },
];

export default async function AdminMonitoringPage() {
  const admin: AdminMonitoringViewModel = await getAdminMonitoringData();
  const { operationalMetrics: metrics } = admin;
  const providerRows = admin.providers.map((provider) => ({
    provider: `${provider.displayName}${provider.isActiveProvider ? ' ★' : ''}`,
    status: provider.statusLabel,
    configured: provider.configured ? 'Yes' : 'No',
    category: provider.category,
    lastChecked: provider.lastCheckedLabel,
    detail: provider.detail,
  }));
  const pipelineRows = admin.pipelines.map((pipeline) => ({
    pipeline: pipeline.label,
    status: pipeline.statusLabel,
    lastUpdated: pipeline.lastUpdatedLabel,
    summary: pipeline.summary,
  }));

  return (
    <>
      <Section className="dashboard-section dashboard-section--hero">
        <WorkstationPageHeader
          eyebrow="Admin monitoring"
          title={admin.title}
          description="Dense operational console for provider checks, pipeline visibility, and warning review."
          summary={admin.freshnessSummary}
          statusLabel={admin.statusLabel}
          statusTone={admin.statusTone}
          meta={[
            { label: 'Last updated', value: admin.lastUpdatedLabel },
            { label: 'Active provider', value: metrics.activeProvider.toUpperCase() },
            { label: 'Providers', value: `${metrics.configuredProviderCount}/${metrics.totalProviderCount}` },
            { label: 'Assets tracked', value: String(metrics.assetCount) },
            { label: 'Pipelines', value: String(admin.pipelines.length) },
          ]}
          actions={[
            { href: '/admin', label: 'Back to admin' },
            { href: '/dashboard', label: 'Open dashboard' },
          ]}
        />
      </Section>

      <Section className="dashboard-section">
        <header className="dashboard-section-heading">
          <div>
            <div className="section__eyebrow">Operational metrics</div>
            <h2 className="dashboard-section-heading__title">Data coverage, freshness, and pipeline activity</h2>
          </div>
        </header>
        <div className="analytics-strip">
          <CompactStatCard label="Assets tracked" value={String(metrics.assetCount)} detail="Total asset records in the persistence layer." />
          <CompactStatCard label="Latest observation" value={metrics.latestObservationLabel} detail="Most recent market observation recorded." />
          <CompactStatCard label="Latest forecast" value={metrics.latestForecastLabel} detail="Most recent forecast produced by the engine." />
          <CompactStatCard label="Latest ingestion" value={metrics.latestIngestionLabel} detail="Last successful ingestion run completed." />
          <CompactStatCard label="Latest provider sync" value={metrics.latestSyncLabel} detail="Last successful provider synchronisation." />
          <CompactStatCard label="Active provider" value={metrics.activeProvider.toUpperCase()} detail={`${metrics.configuredProviderCount} of ${metrics.totalProviderCount} providers are configured.`} />
        </div>
      </Section>

      <Section className="dashboard-section">
        <header className="dashboard-section-heading">
          <div>
            <div className="section__eyebrow">Volume metrics</div>
            <h2 className="dashboard-section-heading__title">Pipeline run counts and provider configuration coverage</h2>
          </div>
        </header>
        <div className="analytics-strip">
          <CompactStatCard label="Ingestion runs" value={String(metrics.ingestionRunCount)} detail="Number of persisted ingestion run records available in the repository." />
          <CompactStatCard label="Provider syncs" value={String(metrics.providerSyncCount)} detail="Number of persisted provider sync summary records in the repository." />
          <CompactStatCard label="Forecast records" value={String(metrics.forecastCount)} detail="Number of persisted forecast preview rows available for dashboard display." />
          <CompactStatCard label="Nominal providers" value={`${admin.providers.filter((p) => p.status === 'nominal').length}/${admin.providers.length}`} detail="Providers currently responding without degradation versus total registered adapters." />
          <CompactStatCard label="Active warnings" value={String(admin.warnings.length)} detail="Current operational warnings active across providers and pipelines." />
          <CompactStatCard label="Nominal pipelines" value={`${admin.pipelines.filter((p) => p.status === 'nominal').length}/${admin.pipelines.length}`} detail="Pipelines currently reporting a nominal repository-backed state." />
        </div>
      </Section>

      <Section className="dashboard-section dashboard-section--tinted">
        <div className="analytics-two-grid">
          <WarningsPanel
            title="Active warnings"
            subtitle="Current operational warnings across persistence and provider checks."
            warnings={admin.warnings}
            emptyMessage="No active warnings are currently present."
          />
          <div className="analytics-side-stack">
            {admin.providers.map((provider) => (
              <OperationalStatusCard
                key={provider.id}
                eyebrow={provider.isActiveProvider ? `Active · ${provider.category}` : provider.category}
                title={provider.displayName}
                summary={provider.detail}
                detail={provider.capabilities.join(' · ')}
                statusLabel={provider.statusLabel}
                statusTone={provider.statusTone}
                timestampLabel={provider.lastCheckedLabel}
              />
            ))}
          </div>
        </div>
      </Section>

      <Section className="dashboard-section dashboard-section--tinted">
        <div className="analytics-two-grid analytics-two-grid--tables">
          <AnalyticsTable
            title="Provider monitoring log"
            subtitle="Current provider check state across the configured adapter set."
            columns={providerColumns}
            rows={providerRows}
            emptyMessage="No provider monitoring rows are currently available."
          />
          <AnalyticsTable
            title="Pipeline monitoring log"
            subtitle="Repository-backed pipeline summaries for ingestion, sync, and forecast refresh."
            columns={pipelineColumns}
            rows={pipelineRows}
            emptyMessage="No pipeline monitoring rows are currently available."
          />
        </div>
      </Section>
    </>
  );
}
