import Link from 'next/link';
import { requireCurrentSession } from '../../../server/auth/session';
import { getPortfolioIntelligenceViewModel } from '../../../server/services/portfolio-intelligence-service';
import { Section } from '../../../components/ui/section';
import { Card } from '../../../components/ui/card';
import { CompactStatCard } from '../../../components/stats/compact-stat-card';

export const dynamic = 'force-dynamic';

function formatPct(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

function toneForDelta(delta: number): 'positive' | 'negative' | 'neutral' {
  if (delta > 0.005) return 'positive';
  if (delta < -0.005) return 'negative';
  return 'neutral';
}

function riskTone(level: string): 'positive' | 'negative' | 'neutral' {
  if (level === 'HIGH' || level === 'CRITICAL' || level === 'EXTREME') return 'negative';
  if (level === 'LOW') return 'positive';
  return 'neutral';
}

export default async function PortfolioIntelligencePage() {
  await requireCurrentSession('/login');
  const vm = await getPortfolioIntelligenceViewModel();

  if (vm.status === 'empty') {
    return (
      <Section className="dashboard-section">
        <Card className="analytics-card">
          <div className="analytics-card__header">
            <div>
              <div className="section__eyebrow">Portfolio Intelligence</div>
              <h3>No intelligence available</h3>
              <p>{vm.statusReason}</p>
            </div>
          </div>
          <div className="analytics-card__action-grid">
            <Link href="/markets/intelligence" className="button button--primary">
              View market intelligence
            </Link>
            <Link href="/invest" className="button button--secondary">
              Browse assets
            </Link>
          </div>
        </Card>
      </Section>
    );
  }

  const { intelligence, brokerReadiness, brokerPreviews, portfolioContext } = vm;
  const { portfolioSummary, allocations, rebalancePlan, riskAlerts } = intelligence;

  return (
    <>
      {/* Header */}
      <Section className="dashboard-section dashboard-section--hero">
        <header className="dashboard-section-heading">
          <div>
            <div className="section__eyebrow">Portfolio Intelligence</div>
            <h2 className="dashboard-section-heading__title">AI-Assisted Allocation Review</h2>
            <p className="dashboard-section-heading__description">
              Deterministic allocation analysis from signal intelligence. Simulation only — no real capital deployed.
            </p>
          </div>
          <span className={`status-pill status-pill--${vm.status === 'nominal' ? 'success' : 'warning'}`}>
            {vm.status}
          </span>
        </header>

        {/* Safety notice — always visible */}
        <div className="alert alert--info" role="alert" aria-live="polite">
          <strong>Simulation only</strong> — {vm.simulationOnlyNotice}
        </div>
      </Section>

      {/* Portfolio context stats */}
      <Section className="dashboard-section">
        <div className="analytics-strip">
          <CompactStatCard
            label="Portfolio value"
            value={formatUsd(portfolioContext.portfolioValue)}
            detail="Simulation portfolio total value."
          />
          <CompactStatCard
            label="Cash balance"
            value={formatUsd(portfolioContext.cashBalance)}
            detail="Available simulation cash."
          />
          <CompactStatCard
            label="Open positions"
            value={String(portfolioContext.openPositionCount)}
            detail="Currently active simulated positions."
          />
          <CompactStatCard
            label="Diversification"
            value={formatPct(portfolioSummary.diversificationScore)}
            detail="Portfolio diversification score (higher is better)."
            valueTone={portfolioSummary.diversificationScore > 0.6 ? 'positive' : portfolioSummary.diversificationScore > 0.3 ? 'neutral' : 'negative'}
          />
          <CompactStatCard
            label="Concentration risk"
            value={portfolioSummary.concentrationRisk}
            detail="Single-asset concentration risk level."
            valueTone={riskTone(portfolioSummary.concentrationRisk)}
          />
          <CompactStatCard
            label="Dominant class"
            value={portfolioSummary.dominantAssetClass}
            detail="Asset class with largest target allocation."
          />
        </div>
      </Section>

      {/* Risk alerts */}
      {riskAlerts.length > 0 && (
        <Section className="dashboard-section">
          <Card className="analytics-card">
            <div className="analytics-card__header">
              <div>
                <div className="section__eyebrow">Risk alerts</div>
                <h3>Active risk warnings</h3>
              </div>
            </div>
            <div className="analytics-card__body">
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {riskAlerts.map((alert, i) => (
                  <li key={i} style={{ marginBottom: '0.5rem' }}>
                    <span className={`status-pill status-pill--${alert.severity === 'CRITICAL' || alert.severity === 'HIGH' ? 'error' : 'warning'}`}>
                      {alert.severity}
                    </span>
                    {alert.symbol && <strong> {alert.symbol}:</strong>}{' '}
                    {alert.message} — <span className="text-muted">{alert.detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        </Section>
      )}

      {/* Allocation table */}
      <Section className="dashboard-section">
        <Card className="analytics-card">
          <div className="analytics-card__header">
            <div>
              <div className="section__eyebrow">Allocation</div>
              <h3>Target allocation by asset</h3>
              <p>{portfolioSummary.explanation}</p>
            </div>
          </div>
          <div className="analytics-card__body">
            {allocations.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th scope="col" style={{ textAlign: 'left' }}>Symbol</th>
                      <th scope="col" style={{ textAlign: 'right' }}>Current</th>
                      <th scope="col" style={{ textAlign: 'right' }}>Target</th>
                      <th scope="col" style={{ textAlign: 'right' }}>Delta</th>
                      <th scope="col" style={{ textAlign: 'left' }}>Action</th>
                      <th scope="col" style={{ textAlign: 'left' }}>Signal</th>
                      <th scope="col" style={{ textAlign: 'right' }}>Confidence</th>
                      <th scope="col" style={{ textAlign: 'left' }}>Risk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allocations.map((alloc) => (
                      <tr key={alloc.symbol}>
                        <td style={{ fontWeight: 600 }}>{alloc.symbol}</td>
                        <td className="tabular-nums" style={{ textAlign: 'right' }}>{formatPct(alloc.currentWeight)}</td>
                        <td className="tabular-nums" style={{ textAlign: 'right' }}>{formatPct(alloc.targetWeight)}</td>
                        <td
                          className="tabular-nums"
                          style={{
                            textAlign: 'right',
                            color: toneForDelta(alloc.deltaWeight) === 'positive' ? 'var(--color-success)' : toneForDelta(alloc.deltaWeight) === 'negative' ? 'var(--color-destructive)' : undefined,
                          }}
                        >
                          {alloc.deltaWeight >= 0 ? '+' : ''}{formatPct(alloc.deltaWeight)}
                        </td>
                        <td>
                          <span className={`status-pill status-pill--${alloc.suggestedAction === 'ENTER' || alloc.suggestedAction === 'INCREASE' ? 'success' : alloc.suggestedAction === 'EXIT' || alloc.suggestedAction === 'DECREASE' ? 'warning' : 'neutral'}`}>
                            {alloc.suggestedAction}
                          </span>
                        </td>
                        <td>
                          <span className="text-muted" style={{ fontSize: '0.75rem' }}>{alloc.recommendationAction}</span>
                        </td>
                        <td className="tabular-nums" style={{ textAlign: 'right' }}>{formatPct(alloc.confidence)}</td>
                        <td>
                          <span className={`status-pill status-pill--${riskTone(alloc.riskLevel) === 'negative' ? 'error' : riskTone(alloc.riskLevel) === 'positive' ? 'success' : 'neutral'}`}>
                            {alloc.riskLevel}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted">No allocations computed.</p>
            )}
          </div>
        </Card>
      </Section>

      {/* Rebalance plan */}
      <Section className="dashboard-section dashboard-section--tinted">
        <Card className="analytics-card">
          <div className="analytics-card__header">
            <div>
              <div className="section__eyebrow">Rebalance plan</div>
              <h3>Suggested simulation trades</h3>
              <p>
                {rebalancePlan.length > 0
                  ? `${rebalancePlan.length} trade${rebalancePlan.length !== 1 ? 's' : ''} required to reach target allocation.`
                  : 'Portfolio is within rebalance threshold — no trades required.'}
              </p>
            </div>
          </div>
          {rebalancePlan.length > 0 && (
            <div className="analytics-card__body">
              <table className="data-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th scope="col" style={{ textAlign: 'left' }}>Symbol</th>
                    <th scope="col" style={{ textAlign: 'left' }}>Side</th>
                    <th scope="col" style={{ textAlign: 'right' }}>Weight delta</th>
                    <th scope="col" style={{ textAlign: 'right' }}>Notional %</th>
                    <th scope="col" style={{ textAlign: 'left' }}>Reasoning</th>
                  </tr>
                </thead>
                <tbody>
                  {rebalancePlan.map((trade) => (
                    <tr key={trade.symbol}>
                      <td style={{ fontWeight: 600 }}>{trade.symbol}</td>
                      <td>
                        <span className={`status-pill status-pill--${trade.side === 'buy' ? 'success' : 'warning'}`}>
                          {trade.side.toUpperCase()}
                        </span>
                      </td>
                      <td className="tabular-nums" style={{ textAlign: 'right' }}>
                        {trade.targetWeightDelta >= 0 ? '+' : ''}{formatPct(trade.targetWeightDelta)}
                      </td>
                      <td className="tabular-nums" style={{ textAlign: 'right' }}>
                        {trade.estimatedNotionalPct.toFixed(1)}%
                      </td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--color-muted-foreground)' }}>
                        {trade.reasoning.slice(0, 100)}{trade.reasoning.length > 100 ? '…' : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </Section>

      {/* Broker preview panel */}
      <Section className="dashboard-section">
        <Card className="analytics-card">
          <div className="analytics-card__header">
            <div>
              <div className="section__eyebrow">Broker preview</div>
              <h3>Execution quality estimates</h3>
              <p>
                Simulation-mode execution preview. Fill prices and fees are estimates only.
                Live execution is permanently locked.
              </p>
            </div>
            <span className={`status-pill status-pill--${brokerReadiness.ready ? 'success' : 'warning'}`}>
              {brokerReadiness.ready ? 'Ready' : 'Not ready'}
            </span>
          </div>
          <div className="analytics-card__body">
            <p className="text-muted" style={{ marginBottom: '1rem' }}>
              {brokerReadiness.summary}
            </p>
            {brokerPreviews.length > 0 ? (
              <table className="data-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th scope="col" style={{ textAlign: 'left' }}>Symbol</th>
                    <th scope="col" style={{ textAlign: 'left' }}>Side</th>
                    <th scope="col" style={{ textAlign: 'right' }}>Est. fill</th>
                    <th scope="col" style={{ textAlign: 'right' }}>Slippage</th>
                    <th scope="col" style={{ textAlign: 'right' }}>Fees</th>
                    <th scope="col" style={{ textAlign: 'left' }}>Executable</th>
                    <th scope="col" style={{ textAlign: 'left' }}>Flags</th>
                  </tr>
                </thead>
                <tbody>
                  {brokerPreviews.map(({ symbol, side, decision }) => (
                    <tr key={symbol}>
                      <td style={{ fontWeight: 600 }}>{symbol}</td>
                      <td>
                        <span className={`status-pill status-pill--${side === 'buy' ? 'success' : 'warning'}`}>
                          {side.toUpperCase()}
                        </span>
                      </td>
                      <td className="tabular-nums" style={{ textAlign: 'right' }}>
                        ${decision.estimatedFillPrice.toFixed(4)}
                      </td>
                      <td className="tabular-nums" style={{ textAlign: 'right' }}>
                        ${decision.estimatedSlippage.toFixed(4)}
                      </td>
                      <td className="tabular-nums" style={{ textAlign: 'right' }}>
                        ${decision.estimatedFees.toFixed(4)}
                      </td>
                      <td>
                        <span className={`status-pill status-pill--${decision.executable ? 'success' : 'error'}`}>
                          {decision.executable ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.75rem' }}>
                        {decision.riskFlags.length > 0 ? decision.riskFlags.join(', ') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-muted">No rebalance trades to preview.</p>
            )}
          </div>
        </Card>
      </Section>

      {/* Explanation panel */}
      <Section className="dashboard-section">
        <Card className="analytics-card">
          <div className="analytics-card__header">
            <div>
              <div className="section__eyebrow">Intelligence explanation</div>
              <h3>Why these allocations?</h3>
            </div>
          </div>
          <div className="analytics-card__body">
            <p>{intelligence.explanation}</p>
            <p className="text-muted" style={{ marginTop: '0.75rem', fontSize: '0.75rem' }}>
              Allocations are derived from signal confidence, recommendation action, risk level, news risk, and
              provider health. Correlation penalties reduce weight on assets in the same class when concentration
              is high. All values are indicative — not financial advice.
            </p>
            <p className="text-muted" style={{ marginTop: '0.5rem', fontSize: '0.75rem' }}>
              Past performance does not guarantee future results. This is not financial advice.
            </p>
          </div>
        </Card>
      </Section>

      {/* Simulation CTA */}
      <Section className="dashboard-section">
        <Card className="analytics-card">
          <div className="analytics-card__header">
            <div>
              <div className="section__eyebrow">Execute plan</div>
              <h3>Execute rebalance (simulation)</h3>
              <p>
                Review the plan above, then execute individual trades in the simulation workstation.
                <strong> No real capital is deployed.</strong>
              </p>
            </div>
          </div>
          <div className="analytics-card__action-grid">
            <Link href="/invest/simulation" className="button button--primary">
              Open simulation workstation
            </Link>
            <Link href="/portfolio" className="button button--secondary">
              Back to portfolio overview
            </Link>
            <Link href="/markets/intelligence" className="button button--secondary">
              View market intelligence
            </Link>
          </div>
          <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--color-muted)', borderRadius: '0.375rem' }}>
            <p style={{ fontSize: '0.75rem', margin: 0, color: 'var(--color-muted-foreground)' }}>
              ⚠ Simulation only — no real capital deployed. Live trading is locked.
              All execution occurs within the deterministic simulation engine.
            </p>
          </div>
        </Card>
      </Section>
    </>
  );
}
