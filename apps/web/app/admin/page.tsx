import type { AdminMonitoringViewModel } from '../../server/mappers/admin-mapper';
import Link from 'next/link';
import { OperationalStatusCard } from '../../components/admin/operational-status-card';
import { WarningsPanel } from '../../components/admin/warnings-panel';
import { WorkstationPageHeader } from '../../components/asset/workstation-page-header';
import { InsightCallout } from '../../components/analytics/insight-callout';
import { CompactStatCard } from '../../components/stats/compact-stat-card';
import { Section } from '../../components/ui/section';
import { getAdminMonitoringData } from '../../server/services/admin-service';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const admin: AdminMonitoringViewModel = await getAdminMonitoringData();
  const nominalProviders = admin.providers.filter((provider) => provider.status === 'nominal').length;
  const degradedProviders = admin.providers.filter((provider) => provider.status === 'degraded').length;
  const nominalPipelines = admin.pipelines.filter((pipeline) => pipeline.status === 'nominal').length;

  return (
    <>
      <Section className="dashboard-section dashboard-section--hero">
        <WorkstationPageHeader
          eyebrow="Admin console"
          title={admin.title}
          description={admin.description}
          summary={admin.freshnessSummary}
          statusLabel={admin.statusLabel}
          statusTone={admin.statusTone}
          meta={[
            { label: 'Last updated', value: admin.lastUpdatedLabel },
            { label: 'Active provider', value: admin.operationalMetrics.activeProvider.toUpperCase() },
            { label: 'Providers', value: `${admin.operationalMetrics.configuredProviderCount}/${admin.operationalMetrics.totalProviderCount} configured` },
            { label: 'Warnings', value: String(admin.warnings.length) },
          ]}
          actions={[
            { href: '/admin/monitoring', label: 'Open monitoring' },
            { href: '/dashboard', label: 'Open dashboard' },
          ]}
        />
      </Section>

      <Section className="dashboard-section">
        <header className="dashboard-section-heading">
          <div>
            <div className="section__eyebrow">Operational summary</div>
            <h2 className="dashboard-section-heading__title">Provider readiness, pipeline posture, and warning concentration</h2>
          </div>
        </header>
        <div className="analytics-strip">
          <CompactStatCard label="Nominal providers" value={`${nominalProviders}/${admin.providers.length}`} detail="Providers currently responding without degradation." />
          <CompactStatCard label="Degraded providers" value={String(degradedProviders)} detail="Provider checks currently failing or returning degraded status." />
          <CompactStatCard label="Nominal pipelines" value={`${nominalPipelines}/${admin.pipelines.length}`} detail="Operational pipelines with nominal repository-backed state." />
          <CompactStatCard label="Open warnings" value={String(admin.warnings.length)} detail="Warnings that need monitoring or remediation follow-up." />
        </div>
      </Section>

      <Section className="dashboard-section dashboard-section--tinted">
        <div className="analytics-two-grid">
          <section aria-labelledby="provider-status-heading">
            <header className="dashboard-section-heading">
              <div>
                <div className="section__eyebrow">Provider health</div>
                <h2 id="provider-status-heading" className="dashboard-section-heading__title">
                  Connectivity and provider readiness — {admin.operationalMetrics.configuredProviderCount}/{admin.operationalMetrics.totalProviderCount} configured
                </h2>
              </div>
            </header>
            <div className="analytics-two-grid">
              {admin.providers.map((provider) => (
                <OperationalStatusCard
                  key={provider.id}
                  eyebrow={provider.isActiveProvider ? `Active provider · ${provider.category}` : `${provider.category}`}
                  title={provider.displayName}
                  summary={provider.detail}
                  detail={provider.capabilities.join(' · ')}
                  statusLabel={provider.statusLabel}
                  statusTone={provider.statusTone}
                  timestampLabel={provider.lastCheckedLabel}
                />
              ))}
            </div>
          </section>

          <WarningsPanel
            title="Warnings and escalations"
            subtitle="Internal issues that currently need attention."
            warnings={admin.warnings}
            emptyMessage="No warnings are currently active."
          />
        </div>
      </Section>

      <Section className="dashboard-section">
        <div className="analytics-two-grid">
          <section aria-labelledby="pipeline-heading">
            <header className="dashboard-section-heading">
              <div>
                <div className="section__eyebrow">Pipeline visibility</div>
                <h2 id="pipeline-heading" className="dashboard-section-heading__title">
                  Ingestion, provider sync, and forecast refresh
                </h2>
              </div>
            </header>
            <div className="analytics-three-grid">
              {admin.pipelines.map((pipeline) => (
                <OperationalStatusCard
                  key={pipeline.id}
                  eyebrow="Pipeline"
                  title={pipeline.label}
                  summary={pipeline.summary}
                  detail="Pipeline state is derived from the current repository-backed dashboard operational view model."
                  statusLabel={pipeline.statusLabel}
                  statusTone={pipeline.statusTone}
                  timestampLabel={pipeline.lastUpdatedLabel}
                />
              ))}
            </div>
          </section>

          <div className="analytics-side-stack">
            <InsightCallout title="Monitoring stays server-owned" body={admin.notes[1] ?? 'Provider checks and operational summaries remain behind the query and service layers.'} />
            <article className="surface detail-slot-card">
              <div className="surface__inner detail-slot-card__inner">
                <div className="detail-slot-card__eyebrow">Next surface</div>
                <h3 className="detail-slot-card__title">Monitoring console</h3>
                <p className="detail-slot-card__description">
                  The deeper monitoring route provides denser operational tables, timestamps, and warning review in one place.
                </p>
                <Link href="/admin/monitoring" className="module-panel__link">
                  Open monitoring surface
                </Link>
              </div>
            </article>
          </div>
        </div>
      </Section>
    </>
  );
}
