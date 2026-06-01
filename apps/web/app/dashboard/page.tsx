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
import { DashboardGroup } from '../../components/dashboard/dashboard-group';
import { DashboardMissionControl } from '../../components/dashboard/dashboard-mission-control';
import { requireCurrentSession } from '../../server/auth/session';
import { getDashboardExecutiveViewModel } from '../../server/services/dashboard-executive-service';
import { getAccountIntelligenceViewModel } from '../../server/services/account-intelligence-service';
import { computeNextBestActions } from '../../lib/dashboard-next-actions';
import { getMessages } from '../../lib/i18n/messages';
import { getRequestLocale } from '../../server/i18n/locale';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const session = await requireCurrentSession('/login');
  const locale = await getRequestLocale();
  const messages = getMessages(locale);
  // Executive (market) intelligence + personal (account) intelligence in parallel.
  // The account band is optional: if it fails, the dashboard still renders.
  const [model, accountVm] = await Promise.all([
    getDashboardExecutiveViewModel({ userId: session.user.id }),
    getAccountIntelligenceViewModel().catch(() => null),
  ]);

  // Mission Control band (account/simulation dimension), derived from real state.
  const missionControl = accountVm
    ? (() => {
        const providerOk = model.providerHealth.total > 0 && model.providerHealth.degraded === 0 && !model.degraded;
        const freshness = {
          label: providerOk ? 'Data nominal' : 'Data degraded',
          tone: providerOk ? ('positive' as const) : ('warning' as const),
          detail: model.providerHealth.summary,
        };
        const journalRatio =
          accountVm.activity.totalTrades > 0
            ? Math.min(1, accountVm.activity.journalEntryCount / accountVm.activity.totalTrades)
            : null;
        const nextActions = computeNextBestActions({
          hasTrades: accountVm.hasTrades,
          totalTrades: accountVm.hero.tradeCount,
          journalCoverageRatio: journalRatio,
          concentrationLevel: accountVm.risk.concentrationLevel,
          largestPositionLabel: accountVm.risk.largestPositionLabel,
          cashDeploymentRatio: accountVm.risk.cashDeploymentRatio,
          watchlistCount: accountVm.activity.watchlistCount,
          staleData: model.degraded,
          openPositions: accountVm.hero.positionCount,
        }).slice(0, 4);
        return <DashboardMissionControl vm={accountVm} nextActions={nextActions} freshness={freshness} />;
      })()
    : undefined;

  return (
    <DashboardShell
      hero={<DashboardHero model={model} />}
      kpis={<DashboardKpiStrip model={model} />}
      topBand={missionControl}
      body={(
        <>
          <DashboardGroup
            title="Portfolio Overview"
            subtitle="Your simulated book value, state, and trade-readiness guardrails."
            lead
          >
            <DashboardPanel eyebrow="Portfolio Intelligence" title="Portfolio snapshot" description="Allocation and risk state." href="/portfolio/intelligence">
              <div className="dashboard-exec-list">
                <article className="dashboard-exec-list__item"><strong>Portfolio value</strong><span>{model.portfolioSnapshot.value}</span></article>
                <article className="dashboard-exec-list__item"><strong>State</strong><span>{model.portfolioSnapshot.state}</span></article>
                <article className="dashboard-exec-list__item">
                  <strong>Open positions</strong>
                  <span className="num-bubble num-bubble--info num-bubble--small" aria-label={`${model.portfolioSnapshot.openPositions} open positions`}>{model.portfolioSnapshot.openPositions}</span>
                </article>
                <article className="dashboard-exec-list__item"><strong>Risk score</strong><span>{model.portfolioSnapshot.riskScore}</span></article>
              </div>
            </DashboardPanel>
            <DashboardSimulationReadiness model={model} />
          </DashboardGroup>

          <DashboardGroup
            title="Risk Overview"
            subtitle="Escalations and cross-asset dependencies that change your risk picture."
          >
            <DashboardAlertQueue model={model} />
            <DashboardPanel eyebrow="Cross-Asset Intelligence" title="Relationship engine" description="Cross-asset dependencies, correlations, and narrative context derived from live observations." href="/observe">
              <div className="dashboard-exec-list">
                {model.relationships.length === 0 ? (
                  <div className="aurox-empty-state aurox-empty-state--inline">
                    <p className="aurox-empty-state__title">No cross-asset relationships detected</p>
                    <p className="text-muted" style={{ fontSize: '0.8rem' }}>
                      The relationship engine requires active observations. Open the Observer to generate market intelligence.
                    </p>
                    <Link href="/observe" className="button button--secondary">Open Observer</Link>
                  </div>
                ) : model.relationships.map((row) => (
                  <article key={row.id} className="dashboard-exec-list__item">
                    <strong>{row.title}</strong>
                    <span className={`status-pill status-pill--${row.severity === 'CRITICAL' ? 'danger' : row.severity === 'WARNING' ? 'warning' : row.severity === 'WATCH' ? 'info' : 'success'}`}>{row.severity}</span>
                    <p className="text-muted">{row.narrative}</p>
                    <span className="text-muted">{row.symbols.join(', ')}</span>
                  </article>
                ))}
              </div>
            </DashboardPanel>
          </DashboardGroup>

          <DashboardGroup
            title="Market Overview"
            subtitle="Live market pulse and coverage across stocks, ETFs, and crypto."
            lead
          >
            <DashboardMarketPulse
              model={model}
              labels={{
                eyebrow: messages.dashboard.marketPulseEyebrow,
                title: messages.dashboard.marketPulseTitle,
                description: messages.dashboard.marketPulseDescription,
                unavailable: messages.dashboard.marketPulseUnavailable,
              }}
            />
            <DashboardAssetClassSnapshot model={model} />
          </DashboardGroup>

          <DashboardGroup
            title="AI Overview"
            subtitle="Explainable signal distribution and the most relevant observer outputs."
          >
            <DashboardSignalSnapshot model={model} />
            <DashboardObservationSummary model={model} />
          </DashboardGroup>

          <DashboardGroup
            title="Research Overview"
            subtitle="News shocks and the health of the data providers behind every number."
          >
            <DashboardPanel eyebrow="News Impact" title="News shock snapshot" description="Top headlines and sentiment shocks." href="/news">
              <div className="dashboard-exec-list">
                <article className="dashboard-exec-list__item">
                  <strong>Shock count</strong>
                  <span className="num-bubble num-bubble--warning num-bubble--small" aria-label={`${model.newsSnapshot.shockCount} news shocks`}>{model.newsSnapshot.shockCount}</span>
                </article>
                {model.newsSnapshot.headlines.map((item) => (
                  <article key={item.id} className="dashboard-exec-list__item">
                    <strong>{item.title}</strong>
                    <span className="text-muted">{item.source}</span>
                    {item.href ? <a href={item.href} target="_blank" rel="noreferrer noopener">Open source</a> : <span className="text-muted">No source URL</span>}
                  </article>
                ))}
              </div>
            </DashboardPanel>
            <DashboardProviderHealth model={model} />
          </DashboardGroup>
        </>
      )}
      ctas={(
        <div className="dashboard-exec-cta-band">
          <Link href="/market" className="button">Open Market Workstation</Link>
          <Link href="/observe" className="button button--secondary">Open Observer Feed</Link>
          <Link href="/alerts" className="button button--secondary">Inspect Alert Center</Link>
          <Link href="/invest/simulation" className="button button--secondary">Open Simulation Cockpit</Link>
          <Link href="/portfolio/intelligence" className="button button--secondary">Review Portfolio Intelligence</Link>
          <span className="dashboard-exec-cta-band__hint text-muted">Press <kbd>⌘K</kbd> for quick navigation</span>
        </div>
      )}
    />
  );
}
