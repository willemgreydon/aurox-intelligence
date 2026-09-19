import Link from 'next/link';
import type { AppMessages } from '../../lib/i18n/messages';
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
  messages: AppMessages;
};

/**
 * Mission Control band — the personal/simulation intelligence layer of the
 * dashboard. Reuses the real account-intelligence view model (snapshots,
 * transactions, positions) so nothing is fabricated. Leads with "how is my
 * account doing + what to do next", then compact moneyflow / risk / activity.
 */
export function DashboardMissionControl({ vm, nextActions, freshness, messages }: Props) {
  const t = messages.dashboard.mission;
  return (
    <section className="dashboard-section dashboard-section--compact mission-control" aria-label={t.ariaLabel}>
      <div className="mission-control__head">
        <div>
          <div className="section__eyebrow">{t.eyebrow}</div>
          <h2 className="mission-control__title">{t.title}</h2>
          <p className="mission-control__subtitle">{t.simulationNotice}</p>
        </div>
        <div className="mission-control__actions">
          <Link className="button button--primary" href="/invest/simulation">{t.openSimulation}</Link>
          <Link className="button button--secondary" href="/account">{t.accountOverview}</Link>
          <span className={`mission-control__freshness mission-control__freshness--${freshness.tone}`} title={freshness.detail}>
            {freshness.label}
          </span>
        </div>
      </div>

      {/* Executive KPI strip — real account figures, estimates marked. */}
      <div className="analytics-strip mission-control__kpis">
        <CompactStatCard label={t.simulatedValue} value={vm.hero.totalValueLabel} detail={t.simulatedValueDetail} />
        <CompactStatCard label={t.todayPnl} value={vm.hero.todayPnl.label} valueTone={vm.hero.todayPnl.tone} detail={t.todayPnlDetail} />
        <CompactStatCard label={t.sevenDayPnl} value={vm.hero.sevenDayPnl.label} valueTone={vm.hero.sevenDayPnl.tone} detail={t.sevenDayPnlDetail} />
        <CompactStatCard label={t.cash} value={vm.hero.cashLabel} detail={t.cashDetail} />
        <CompactStatCard label={t.invested} value={vm.hero.investedLabel} detail={t.investedDetail} />
        <CompactStatCard label={t.openPositions} value={String(vm.hero.positionCount)} detail={t.openPositionsDetail} />
        <CompactStatCard label={t.paperTrades} value={String(vm.hero.tradeCount)} detail={t.paperTradesDetail} />
      </div>

      {/* Simulation performance — real snapshot-derived value line + daily P/L bars. */}
      <Card className="mission-control__performance">
        <SectionHeader
          eyebrow={t.performanceEyebrow}
          title={t.performanceTitle}
          as="h3"
          description={t.performanceDescription}
        />
        <AccountPerformanceTimeline timeline={vm.timeline} period={vm.hero} />
      </Card>

      <div className="mission-control__grid">
        {/* Next best actions — derived from real state, non-advisory. */}
        <Card>
          <SectionHeader eyebrow={t.nextEyebrow} title={t.nextTitle} as="h3" />
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
            <p className="account-empty">{t.noActions}</p>
          )}
        </Card>

        {/* Moneyflow mini */}
        <Card>
          <SectionHeader eyebrow={t.moneyflowEyebrow} title={t.moneyflowTitle} as="h3" />
          {vm.moneyflow.hasData ? (
            <div className="mission-mini">
              <div className="mission-mini__row"><span>{t.buyVolume}</span><strong>{vm.moneyflow.buyVolumeLabel}</strong></div>
              <div className="mission-mini__row"><span>{t.sellVolume}</span><strong>{vm.moneyflow.sellVolumeLabel}</strong></div>
              <div className="mission-mini__row"><span>{t.netInvested}</span><strong>{vm.moneyflow.netInvestedLabel}</strong></div>
              <div className="mission-mini__row"><span>{t.realizedPnl}</span><strong className={`account-pnl--${vm.moneyflow.realizedPnl.tone}`}>{vm.moneyflow.realizedPnl.label}</strong></div>
              <BuySellBar buyLabel={vm.moneyflow.buyVolumeLabel} sellLabel={vm.moneyflow.sellVolumeLabel} />
            </div>
          ) : (
            <p className="account-empty">{t.moneyflowEmpty}</p>
          )}
          <Link href="/account" className="mission-link">{t.fullAccountIntelligence}</Link>
        </Card>

        {/* Risk / concentration mini */}
        <Card>
          <SectionHeader eyebrow={t.riskEyebrow} title={t.riskTitle} as="h3" />
          {vm.risk.hasPositions ? (
            <div className="mission-mini">
              <div className="mission-mini__row">
                <span>{t.concentration}</span>
                <strong className={`account-risk-badge account-risk-badge--${vm.risk.concentrationLevel}`}>{vm.risk.concentrationLevel}</strong>
              </div>
              <div className="mission-mini__row"><span>{t.largestPosition}</span><strong>{vm.risk.largestPositionLabel ?? '—'}</strong></div>
              <div className="mission-mini__row"><span>{t.cashDeployment}</span><strong>{vm.risk.cashDeploymentLabel}</strong></div>
              <div className="mission-mini__row"><span>{t.journalCoverage}</span><strong>{vm.risk.journalCoverageLabel}</strong></div>
            </div>
          ) : (
            <p className="account-empty">{t.riskEmpty}</p>
          )}
        </Card>

        {/* Activity mini */}
        <Card>
          <SectionHeader eyebrow={t.activityEyebrow} title={t.activityTitle} as="h3" />
          {vm.activity.totalTrades > 0 ? (
            <div className="mission-mini">
              <div className="mission-mini__row"><span>{t.tradesBuysSells}</span><strong>{vm.activity.buyCount} / {vm.activity.sellCount}</strong></div>
              <div className="mission-mini__row"><span>{t.activeDays}</span><strong>{vm.activity.activeDays}</strong></div>
              <div className="mission-mini__row"><span>{t.journalEntries}</span><strong>{vm.activity.journalEntryCount}</strong></div>
              {vm.activity.mostTradedSymbols.length > 0 ? (
                <p className="account-muted">{t.mostTraded}{vm.activity.mostTradedSymbols.slice(0, 3).map((s) => `${s.symbol} (${s.tradeCount})`).join(', ')}</p>
              ) : null}
            </div>
          ) : (
            <p className="account-empty">{t.activityEmpty}</p>
          )}
          <Link href="/invest/simulation?tab=journal" className="mission-link">{t.openJournal}</Link>
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
