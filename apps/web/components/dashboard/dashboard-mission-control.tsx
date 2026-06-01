import Link from 'next/link';
import type { AccountIntelligenceViewModel } from '../../server/services/account-intelligence-service';
import type { NextAction } from '../../lib/dashboard-next-actions';
import { Card } from '../ui/card';
import { SectionHeader } from '../ui/section-header';
import { CompactStatCard } from '../stats/compact-stat-card';
import { AccountPerformanceTimeline } from '../account/account-performance-timeline';

type Props = {
  vm: AccountIntelligenceViewModel;
  nextActions: NextAction[];
  /** Compact data-freshness summary derived from the executive provider model. */
  freshness: { label: string; tone: 'positive' | 'warning' | 'neutral'; detail: string };
};

/**
 * Mission Control band — the personal/simulation intelligence layer of the
 * dashboard. Reuses the real account-intelligence view model (snapshots,
 * transactions, positions) so nothing is fabricated. Leads with "how is my
 * account doing + what to do next", then compact moneyflow / risk / activity.
 */
export function DashboardMissionControl({ vm, nextActions, freshness }: Props) {
  return (
    <section className="dashboard-section dashboard-section--compact mission-control" aria-label="Account mission control">
      <div className="mission-control__head">
        <div>
          <div className="section__eyebrow">Mission control</div>
          <h2 className="mission-control__title">Your simulated account</h2>
          <p className="mission-control__subtitle">{vm.simulationOnlyNotice}</p>
        </div>
        <div className="mission-control__actions">
          <Link className="button button--primary" href="/invest/simulation">Open simulation</Link>
          <Link className="button button--secondary" href="/account">Account overview</Link>
          <span className={`mission-control__freshness mission-control__freshness--${freshness.tone}`} title={freshness.detail}>
            {freshness.label}
          </span>
        </div>
      </div>

      {/* Executive KPI strip — real account figures, estimates marked. */}
      <div className="analytics-strip mission-control__kpis">
        <CompactStatCard label="Simulated value" value={vm.hero.totalValueLabel} detail="Cash + open simulated positions." />
        <CompactStatCard label="Today's P/L (est.)" value={vm.hero.todayPnl.label} valueTone={vm.hero.todayPnl.tone} detail="vs previous recorded snapshot." />
        <CompactStatCard label="7-day P/L (est.)" value={vm.hero.sevenDayPnl.label} valueTone={vm.hero.sevenDayPnl.tone} detail="Across recorded snapshots." />
        <CompactStatCard label="Cash" value={vm.hero.cashLabel} detail="Available for new paper trades." />
        <CompactStatCard label="Invested" value={vm.hero.investedLabel} detail="Cost basis of open positions." />
        <CompactStatCard label="Open positions" value={String(vm.hero.positionCount)} detail="Active simulated holdings." />
        <CompactStatCard label="Paper trades" value={String(vm.hero.tradeCount)} detail="Total simulated trades." />
      </div>

      {/* Simulation performance — real snapshot-derived value line + daily P/L bars. */}
      <Card className="mission-control__performance">
        <SectionHeader
          eyebrow="Performance"
          title="Simulation performance"
          as="h3"
          description="Account value and daily P/L from recorded snapshots. Estimated."
        />
        <AccountPerformanceTimeline timeline={vm.timeline} period={vm.hero} />
      </Card>

      <div className="mission-control__grid">
        {/* Next best actions — derived from real state, non-advisory. */}
        <Card>
          <SectionHeader eyebrow="Next" title="Next best actions" as="h3" />
          {nextActions.length > 0 ? (
            <ul className="mission-action-list">
              {nextActions.map((action, i) => (
                <li
                  key={action.id}
                  className={`mission-action mission-action--${action.tone} mission-stagger`}
                  style={{ '--stagger-index': i } as React.CSSProperties}
                >
                  <div className="mission-action__text">
                    <strong>{action.title}</strong>
                    <span>{action.detail}</span>
                  </div>
                  <Link href={action.href} className={`button ${action.tone === 'primary' ? 'button--primary' : 'button--secondary'}`}>
                    {action.ctaLabel}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="account-empty">No actions to surface right now. Your simulated account is in good standing.</p>
          )}
        </Card>

        {/* Moneyflow mini */}
        <Card>
          <SectionHeader eyebrow="Moneyflow" title="How money moved" as="h3" />
          {vm.moneyflow.hasData ? (
            <div className="mission-mini">
              <div className="mission-mini__row"><span>Buy volume</span><strong>{vm.moneyflow.buyVolumeLabel}</strong></div>
              <div className="mission-mini__row"><span>Sell volume</span><strong>{vm.moneyflow.sellVolumeLabel}</strong></div>
              <div className="mission-mini__row"><span>Net invested</span><strong>{vm.moneyflow.netInvestedLabel}</strong></div>
              <div className="mission-mini__row"><span>Realized P/L</span><strong className={`account-pnl--${vm.moneyflow.realizedPnl.tone}`}>{vm.moneyflow.realizedPnl.label}</strong></div>
              <BuySellBar buyLabel={vm.moneyflow.buyVolumeLabel} sellLabel={vm.moneyflow.sellVolumeLabel} />
            </div>
          ) : (
            <p className="account-empty">Moneyflow appears after your first simulated trade.</p>
          )}
          <Link href="/account" className="mission-link">Full account intelligence →</Link>
        </Card>

        {/* Risk / concentration mini */}
        <Card>
          <SectionHeader eyebrow="Risk" title="Concentration" as="h3" />
          {vm.risk.hasPositions ? (
            <div className="mission-mini">
              <div className="mission-mini__row">
                <span>Concentration</span>
                <strong className={`account-risk-badge account-risk-badge--${vm.risk.concentrationLevel}`}>{vm.risk.concentrationLevel}</strong>
              </div>
              <div className="mission-mini__row"><span>Largest position</span><strong>{vm.risk.largestPositionLabel ?? '—'}</strong></div>
              <div className="mission-mini__row"><span>Cash deployment</span><strong>{vm.risk.cashDeploymentLabel}</strong></div>
              <div className="mission-mini__row"><span>Journal coverage (est.)</span><strong>{vm.risk.journalCoverageLabel}</strong></div>
            </div>
          ) : (
            <p className="account-empty">Risk insights appear once you hold simulated positions.</p>
          )}
        </Card>

        {/* Activity mini */}
        <Card>
          <SectionHeader eyebrow="Activity" title="How active you were" as="h3" />
          {vm.activity.totalTrades > 0 ? (
            <div className="mission-mini">
              <div className="mission-mini__row"><span>Trades (buys / sells)</span><strong>{vm.activity.buyCount} / {vm.activity.sellCount}</strong></div>
              <div className="mission-mini__row"><span>Active days</span><strong>{vm.activity.activeDays}</strong></div>
              <div className="mission-mini__row"><span>Journal entries</span><strong>{vm.activity.journalEntryCount}</strong></div>
              {vm.activity.mostTradedSymbols.length > 0 ? (
                <p className="account-muted">Most traded: {vm.activity.mostTradedSymbols.slice(0, 3).map((s) => `${s.symbol} (${s.tradeCount})`).join(', ')}</p>
              ) : null}
            </div>
          ) : (
            <p className="account-empty">Activity intelligence appears after your first simulated trade.</p>
          )}
          <Link href="/invest/simulation?tab=journal" className="mission-link">Open journal →</Link>
        </Card>
      </div>
    </section>
  );
}

/** Tiny proportional buy vs sell bar derived from the formatted labels' numeric content. */
function BuySellBar({ buyLabel, sellLabel }: { buyLabel: string; sellLabel: string }) {
  const buy = parseMoney(buyLabel);
  const sell = parseMoney(sellLabel);
  const total = buy + sell;
  const buyPct = total > 0 ? Math.round((buy / total) * 100) : 50;
  return (
    <div className="mission-buysell" role="img" aria-label={`Buy ${buyLabel} versus sell ${sellLabel}`}>
      <span className="mission-buysell__buy" style={{ width: `${buyPct}%` }} />
      <span className="mission-buysell__sell" style={{ width: `${100 - buyPct}%` }} />
    </div>
  );
}

function parseMoney(label: string): number {
  const n = Number(label.replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? Math.abs(n) : 0;
}
