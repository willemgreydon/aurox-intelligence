import Link from 'next/link';
import { DashboardShell } from '../../components/dashboard/dashboard-shell';
import { DashboardHero } from '../../components/dashboard/dashboard-hero';
import { DashboardKpiStrip } from '../../components/dashboard/dashboard-kpi-strip';
import { DashboardMarketPulse } from '../../components/dashboard/dashboard-market-pulse';
import { DashboardObservationSummary } from '../../components/dashboard/dashboard-observation-summary';
import { DashboardAlertQueue } from '../../components/dashboard/dashboard-alert-queue';
import { DashboardSimulationReadiness } from '../../components/dashboard/dashboard-simulation-readiness';
import { DashboardProviderHealth } from '../../components/dashboard/dashboard-provider-health';
import { DashboardSignalSnapshot } from '../../components/dashboard/dashboard-signal-snapshot';
import { DashboardAssetClassSnapshot } from '../../components/dashboard/dashboard-asset-class-snapshot';
import { DashboardPanel } from '../../components/dashboard/dashboard-panel';
import { requireCurrentSession } from '../../server/auth/session';
import { getDashboardExecutiveViewModel } from '../../server/services/dashboard-executive-service';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const session = await requireCurrentSession('/login');
  const model = await getDashboardExecutiveViewModel({ userId: session.user.id });

  return (
    <DashboardShell
      hero={<DashboardHero model={model} />}
      kpis={<DashboardKpiStrip model={model} />}
      main={(
        <>
          <div className="dashboard-exec-main-grid__left">
            <DashboardMarketPulse model={model} />
            <DashboardObservationSummary model={model} />
            <DashboardPanel eyebrow="Cross-Asset Intelligence" title="Relationship engine" description="Cross-asset dependencies and narrative context." href="/observe">
              <div className="dashboard-exec-list">
                {model.relationships.length === 0 ? <p className="text-muted">Unavailable</p> : model.relationships.map((row) => (
                  <article key={row.id} className="dashboard-exec-list__item">
                    <strong>{row.title}</strong>
                    <span className={`status-pill status-pill--${row.severity === 'CRITICAL' ? 'danger' : row.severity === 'WARNING' ? 'warning' : row.severity === 'WATCH' ? 'info' : 'success'}`}>{row.severity}</span>
                    <p className="text-muted">{row.narrative}</p>
                    <span className="text-muted">{row.symbols.join(', ')}</span>
                  </article>
                ))}
              </div>
            </DashboardPanel>
          </div>

          <div className="dashboard-exec-main-grid__right">
            <DashboardAlertQueue model={model} />
            <DashboardSimulationReadiness model={model} />
            <DashboardProviderHealth model={model} />
          </div>
        </>
      )}
      lower={(
        <>
          <DashboardSignalSnapshot model={model} />
          <DashboardPanel eyebrow="Portfolio Intelligence" title="Portfolio snapshot" description="Allocation and risk state." href="/portfolio/intelligence">
            <div className="dashboard-exec-list">
              <article className="dashboard-exec-list__item"><strong>Portfolio value</strong><span>{model.portfolioSnapshot.value}</span></article>
              <article className="dashboard-exec-list__item"><strong>State</strong><span>{model.portfolioSnapshot.state}</span></article>
              <article className="dashboard-exec-list__item"><strong>Open positions</strong><span>{model.portfolioSnapshot.openPositions}</span></article>
              <article className="dashboard-exec-list__item"><strong>Risk score</strong><span>{model.portfolioSnapshot.riskScore}</span></article>
            </div>
          </DashboardPanel>
          <DashboardPanel eyebrow="News Impact" title="News shock snapshot" description="Top headlines and sentiment shocks." href="/news">
            <div className="dashboard-exec-list">
              <article className="dashboard-exec-list__item"><strong>Shock count</strong><span>{model.newsSnapshot.shockCount}</span></article>
              {model.newsSnapshot.headlines.map((item) => (
                <article key={item.id} className="dashboard-exec-list__item">
                  <strong>{item.title}</strong>
                  <span className="text-muted">{item.source}</span>
                  {item.href ? <a href={item.href} target="_blank" rel="noreferrer noopener">Open source</a> : <span className="text-muted">No source URL</span>}
                </article>
              ))}
            </div>
          </DashboardPanel>
          <DashboardAssetClassSnapshot model={model} />
        </>
      )}
      ctas={(
        <div className="dashboard-exec-cta-band">
          <Link href="/market" className="button">Continue in Market Workstation</Link>
          <Link href="/alerts" className="button button--secondary">Review Alert Center</Link>
          <Link href="/invest/simulation" className="button button--secondary">Run Simulation Check</Link>
        </div>
      )}
    />
  );
}
