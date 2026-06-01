import Link from 'next/link';
import type { AccountIntelligenceViewModel } from '../../server/services/account-intelligence-service';
import { Section } from '../ui/section';
import { Card } from '../ui/card';
import { SectionHeader } from '../ui/section-header';
import { Disclosure } from '../ui/disclosure';
import { CompactStatCard } from '../stats/compact-stat-card';
import { AccountPerformanceTimeline } from './account-performance-timeline';

type Props = {
  vm: AccountIntelligenceViewModel;
  membershipDisclosure: React.ReactNode;
};

/**
 * Account Intelligence cockpit — the simulated-performance self-review surface.
 * Summary-first: value / today's P&L / cash above the fold, then timeline,
 * moneyflow, activity, insights, recent actions. All values are pre-formatted
 * read-model strings; positive/negative carries a text sign, not just color.
 */
export function AccountIntelligenceCockpit({ vm, membershipDisclosure }: Props) {
  return (
    <div className="account-cockpit">
      <Section>
        <div className="account-hero">
          <div className="account-hero__head">
            <div>
              <span className="account-hero__badge">SIMULATION</span>
              <h1 className="account-hero__title">Welcome back, {vm.identity.userName}</h1>
              <p className="account-hero__subtitle">
                Your simulated account at a glance. {vm.simulationOnlyNotice}
              </p>
            </div>
            <div className="account-hero__actions">
              <Link className="button button--primary" href="/invest/simulation">Open simulation</Link>
              <Link className="button button--secondary" href="/invest/simulation?tab=journal">Review journal</Link>
            </div>
          </div>

          <div className="analytics-strip">
            <CompactStatCard label="Total simulated value" value={vm.hero.totalValueLabel} detail="Cash plus current market value of open simulated positions." />
            <CompactStatCard
              label="Today's P/L (est.)"
              value={vm.hero.todayPnl.label}
              valueTone={vm.hero.todayPnl.tone}
              detail="Change vs the previous recorded snapshot. Estimated."
            />
            <CompactStatCard label="Available cash" value={vm.hero.cashLabel} detail="Simulated cash available for new paper trades." />
            <CompactStatCard label="Invested value" value={vm.hero.investedLabel} detail="Cost basis of currently open simulated positions." />
            <CompactStatCard label="Unrealized P/L (est.)" value={vm.hero.unrealizedPnl.label} valueTone={vm.hero.unrealizedPnl.tone} detail="Open positions marked at the latest available quote." />
            <CompactStatCard label="Realized P/L" value={vm.hero.realizedPnl.label} valueTone={vm.hero.realizedPnl.tone} detail="Locked-in gains and losses from simulated sells." />
          </div>
        </div>
      </Section>

      <Section>
        <Card>
          <SectionHeader
            eyebrow="Performance"
            title="Daily timeline"
            description="Day-by-day simulated account value and P/L from recorded snapshots."
          />
          <AccountPerformanceTimeline timeline={vm.timeline} period={vm.hero} />
        </Card>
      </Section>

      <Section>
        <Card>
          <SectionHeader
            eyebrow="Moneyflow"
            title="How your simulated money moved"
            description="Starting capital → buys → sells → realized P/L. Based on recorded simulated transactions."
          />
          {vm.moneyflow.hasData ? (
            <div className="account-moneyflow">
              <div className="moneyflow-waterfall" role="group" aria-label="Moneyflow summary">
                <div className="moneyflow-step"><span>Starting capital</span><strong>{vm.moneyflow.startingCapitalLabel}</strong></div>
                <div className="moneyflow-step moneyflow-step--out"><span>Buy volume</span><strong>{vm.moneyflow.buyVolumeLabel}</strong></div>
                <div className="moneyflow-step moneyflow-step--in"><span>Sell volume</span><strong>{vm.moneyflow.sellVolumeLabel}</strong></div>
                <div className="moneyflow-step"><span>Net invested</span><strong>{vm.moneyflow.netInvestedLabel}</strong></div>
                <div className={`moneyflow-step moneyflow-step--${vm.moneyflow.realizedPnl.tone}`}>
                  <span>Realized P/L</span><strong>{vm.moneyflow.realizedPnl.label}</strong>
                </div>
                <div className="moneyflow-step"><span>Fees (sim)</span><strong>{vm.moneyflow.feesLabel}</strong></div>
              </div>

              {vm.moneyflow.largestInflowLabel || vm.moneyflow.largestOutflowLabel ? (
                <p className="account-muted">
                  {vm.moneyflow.largestOutflowLabel ? <>Largest buy: {vm.moneyflow.largestOutflowLabel}. </> : null}
                  {vm.moneyflow.largestInflowLabel ? <>Largest sell: {vm.moneyflow.largestInflowLabel}.</> : null}
                </p>
              ) : null}

              <Disclosure summary="Asset-level moneyflow" hint={String(vm.moneyflow.assetFlows.length)}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th scope="col">Symbol</th>
                      <th scope="col" className="text-right">Bought</th>
                      <th scope="col" className="text-right">Sold</th>
                      <th scope="col" className="text-right">Realized P/L</th>
                      <th scope="col" className="text-right">Trades</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vm.moneyflow.assetFlows.map((flow) => (
                      <tr key={flow.symbol}>
                        <td>{flow.symbol}</td>
                        <td className="text-right tabular-nums">{flow.buyLabel}</td>
                        <td className="text-right tabular-nums">{flow.sellLabel}</td>
                        <td className={`text-right tabular-nums account-pnl--${flow.realizedPnl.tone}`}>{flow.realizedPnl.label}</td>
                        <td className="text-right tabular-nums">{flow.tradeCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Disclosure>
            </div>
          ) : (
            <p className="account-empty">Your simulation account is ready. Make your first paper trade to start building moneyflow history.</p>
          )}
        </Card>
      </Section>

      <Section>
        <div className="account-two-col">
          <Card>
            <SectionHeader eyebrow="Activity" title="How active you were" as="h3" />
            <dl className="account-stats">
              <div><dt>Simulated trades</dt><dd>{vm.activity.totalTrades}</dd></div>
              <div><dt>Buys / sells</dt><dd>{vm.activity.buyCount} / {vm.activity.sellCount}</dd></div>
              <div><dt>Buy : sell ratio</dt><dd>{vm.activity.buySellRatioLabel}</dd></div>
              <div><dt>Active days</dt><dd>{vm.activity.activeDays}</dd></div>
              <div><dt>Avg trade size</dt><dd>{vm.activity.averageTradeSizeLabel}</dd></div>
              <div><dt>Journal entries</dt><dd>{vm.activity.journalEntryCount}</dd></div>
              <div><dt>Watchlist</dt><dd>{vm.activity.watchlistCount}</dd></div>
            </dl>
            {vm.activity.mostTradedSymbols.length > 0 ? (
              <p className="account-muted">
                Most traded: {vm.activity.mostTradedSymbols.map((s) => `${s.symbol} (${s.tradeCount})`).join(', ')}
              </p>
            ) : null}
          </Card>

          <Card>
            <SectionHeader eyebrow="Review" title="What to look at next" as="h3" />
            <ul className="account-insight-list">
              {vm.insights.bestAssetLabel ? <li><span className="account-insight__tag account-insight__tag--good">Best asset</span> {vm.insights.bestAssetLabel}</li> : null}
              {vm.insights.worstAssetLabel ? <li><span className="account-insight__tag account-insight__tag--bad">Worst asset</span> {vm.insights.worstAssetLabel}</li> : null}
              {vm.insights.reviewSuggestions.map((s, i) => (
                <li key={`sugg-${i}`}><span className="account-insight__tag">Suggestion</span> {s}</li>
              ))}
              {vm.insights.reviewSuggestions.length === 0 && !vm.insights.bestAssetLabel ? (
                <li className="account-muted">Insights appear as you record more simulated activity.</li>
              ) : null}
            </ul>
            <p className="account-disclaimer">Based on available simulation data. Estimated. Not financial advice.</p>
          </Card>
        </div>
      </Section>

      <Section>
        <Card>
          <SectionHeader eyebrow="Recent" title="Recent simulated actions" as="h3" />
          {vm.recentActions.length > 0 ? (
            <ul className="account-action-list">
              {vm.recentActions.map((action) => (
                <li key={action.id} className="account-action">
                  <div className="account-action__head">
                    <span className={`account-action__label account-pnl--${action.tone}`}>{action.label}</span>
                    <span className="account-action__time">{action.timestampLabel}</span>
                  </div>
                  <span className="account-action__detail">{action.detail}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="account-empty">No simulated trades yet. <Link href="/invest">Explore markets</Link> to begin.</p>
          )}
        </Card>
      </Section>

      <Section>
        <Card>
          <Disclosure summary="Account & session details">
            {membershipDisclosure}
          </Disclosure>
        </Card>
      </Section>

      <Section>
        <p className="account-disclaimer">{vm.simulationOnlyNotice}</p>
      </Section>
    </div>
  );
}
