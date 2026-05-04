import Link from 'next/link';
import { requireCurrentSession } from '../../../server/auth/session';
import { getPortfolioIntelligenceViewModel } from '../../../server/services/portfolio-intelligence-service';
import { Section } from '../../../components/ui/section';
import { Card } from '../../../components/ui/card';
import { CompactStatCard } from '../../../components/stats/compact-stat-card';
import type {
  PortfolioAllocation,
  AssetRanking,
  RegimeAwareness,
  PortfolioDiagnostics,
} from '@repo/ai-market-intelligence';
import type { BrokerDecision } from '@repo/agents';

export const dynamic = 'force-dynamic';

// ─── Formatters ───────────────────────────────────────────────────────────────

function formatPct(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

function formatScore(value: number): string {
  return `${(value * 100).toFixed(1)}`;
}

// ─── Tone helpers ─────────────────────────────────────────────────────────────

function toneForDelta(delta: number): 'positive' | 'negative' | 'neutral' {
  if (delta > 0.005) return 'positive';
  if (delta < -0.005) return 'negative';
  return 'neutral';
}

function riskTone(level: string): 'positive' | 'negative' | 'neutral' {
  const upper = level.toUpperCase();
  if (upper === 'HIGH' || upper === 'CRITICAL' || upper === 'EXTREME' || upper === 'critical' || upper === 'high') return 'negative';
  if (upper === 'LOW' || upper === 'low') return 'positive';
  return 'neutral';
}

function healthTone(health: string): string {
  if (health === 'healthy') return 'success';
  if (health === 'concentrated') return 'warning';
  if (health === 'high-risk') return 'error';
  return 'neutral';
}

function regimeTone(regime: string): string {
  if (regime === 'bull') return 'success';
  if (regime === 'bear') return 'error';
  if (regime === 'volatile') return 'warning';
  return 'neutral';
}

function actionTone(action: string): string {
  if (action === 'ENTER' || action === 'INCREASE') return 'success';
  if (action === 'EXIT' || action === 'DECREASE') return 'warning';
  if (action === 'MONITOR') return 'neutral';
  return 'neutral';
}

function nextActionTone(action: string): string {
  if (action === 'simulate') return 'success';
  if (action === 'wait' || action === 'review') return 'warning';
  if (action === 'avoid') return 'error';
  if (action === 'reduce-size') return 'warning';
  return 'neutral';
}

// ─── Inline bar chart ─────────────────────────────────────────────────────────

function ProgressBar({ value, tone = 'neutral', label }: { value: number; tone?: string; label?: string }) {
  const pct = Math.min(100, Math.max(0, value * 100));
  const color =
    tone === 'positive' ? 'var(--color-success)' :
    tone === 'negative' ? 'var(--color-destructive)' :
    'var(--color-muted-foreground)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      {label && <span style={{ fontSize: '0.7rem', color: 'var(--color-muted-foreground)', minWidth: '5rem' }}>{label}</span>}
      <div style={{ flex: 1, height: '0.35rem', background: 'var(--color-muted)', borderRadius: '999px', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '999px', transition: 'width 0.3s ease' }} />
      </div>
      <span style={{ fontSize: '0.7rem', color: 'var(--color-muted-foreground)', minWidth: '2.5rem', textAlign: 'right' }}>{pct.toFixed(0)}%</span>
    </div>
  );
}

// ─── Factor decomposition mini-panel ─────────────────────────────────────────

function FactorPanel({ alloc }: { alloc: PortfolioAllocation }) {
  const fd = alloc.factorDecomposition;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
      <ProgressBar label="Momentum" value={fd.momentumContribution} tone="positive" />
      <ProgressBar label="Confidence" value={fd.confidenceContribution} tone="positive" />
      {fd.volatilityPenalty > 0 && <ProgressBar label="Volatility −" value={fd.volatilityPenalty} tone="negative" />}
      {fd.newsRiskPenalty > 0 && <ProgressBar label="News risk −" value={fd.newsRiskPenalty} tone="negative" />}
      {fd.providerReliabilityPenalty > 0 && <ProgressBar label="Provider −" value={fd.providerReliabilityPenalty} tone="negative" />}
      {fd.correlationPenalty > 0 && <ProgressBar label="Correlation −" value={fd.correlationPenalty} tone="negative" />}
      <ProgressBar label="Final score" value={fd.normalizedScore} tone="neutral" />
    </div>
  );
}

// ─── Risk score badge ─────────────────────────────────────────────────────────

function RiskScoreBadge({ score, level }: { score: number; level: string }) {
  const tone = level === 'critical' ? 'error' : level === 'high' ? 'warning' : level === 'low' ? 'success' : 'neutral';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
      <span className={`status-pill status-pill--${tone}`}>{level.toUpperCase()}</span>
      <span className="tabular-nums" style={{ fontSize: '0.75rem', color: 'var(--color-muted-foreground)' }}>{score.toFixed(0)}/100</span>
    </span>
  );
}

// ─── Regime panel ─────────────────────────────────────────────────────────────

function RegimePanel({ regime }: { regime: RegimeAwareness }) {
  const tone = regimeTone(regime.regime);
  return (
    <Card className="analytics-card">
      <div className="analytics-card__header">
        <div>
          <div className="section__eyebrow">Market regime</div>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span className={`status-pill status-pill--${tone}`}>{regime.regime.toUpperCase()}</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 400, color: 'var(--color-muted-foreground)' }}>
              {(regime.confidence * 100).toFixed(0)}% confidence
            </span>
          </h3>
        </div>
      </div>
      <div className="analytics-card__body">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-muted-foreground)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Evidence</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {regime.evidence.map((e, i) => (
                <li key={i} style={{ fontSize: '0.8rem', color: 'var(--color-foreground)' }}>— {e}</li>
              ))}
            </ul>
          </div>
          <div>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-muted-foreground)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Allocation bias</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <ProgressBar label="Risk-on" value={regime.allocationBias.riskOn} tone={regime.allocationBias.riskOn > 0.5 ? 'positive' : 'neutral'} />
              <ProgressBar label="Cash pref." value={regime.allocationBias.cashPreference} tone="neutral" />
              <ProgressBar label="Equity pref." value={regime.allocationBias.equityPreference} tone="neutral" />
              <ProgressBar label="Crypto pref." value={regime.allocationBias.cryptoPreference} tone="neutral" />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ─── Ranking table ────────────────────────────────────────────────────────────

function RankingTable({ ranking }: { ranking: AssetRanking[] }) {
  if (ranking.length === 0) return <p className="text-muted">No ranking data available.</p>;
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="data-table" style={{ width: '100%' }}>
        <thead>
          <tr>
            <th scope="col" style={{ textAlign: 'right', width: '2.5rem' }}>#</th>
            <th scope="col" style={{ textAlign: 'left' }}>Asset</th>
            <th scope="col" style={{ textAlign: 'left' }}>Class</th>
            <th scope="col" style={{ textAlign: 'left' }}>Signal</th>
            <th scope="col" style={{ textAlign: 'right' }}>Score</th>
            <th scope="col" style={{ textAlign: 'right' }}>Confidence</th>
            <th scope="col" style={{ textAlign: 'right' }}>Risk</th>
            <th scope="col" style={{ textAlign: 'right' }}>Target</th>
            <th scope="col" style={{ textAlign: 'left' }}>Reason</th>
          </tr>
        </thead>
        <tbody>
          {ranking.map((r) => (
            <tr key={r.symbol}>
              <td className="tabular-nums" style={{ textAlign: 'right', color: 'var(--color-muted-foreground)', fontVariantNumeric: 'tabular-nums' }}>{r.rank}</td>
              <td style={{ fontWeight: 600 }}>{r.symbol}</td>
              <td><span className="status-pill status-pill--neutral" style={{ fontSize: '0.65rem' }}>{r.assetClass}</span></td>
              <td><span className={`status-pill status-pill--${r.recommendation.includes('BUY') ? 'success' : r.recommendation.includes('SELL') || r.recommendation === 'AVOID' ? 'error' : 'neutral'}`}>{r.recommendation}</span></td>
              <td className="tabular-nums" style={{ textAlign: 'right' }}>{formatScore(r.finalScore)}</td>
              <td className="tabular-nums" style={{ textAlign: 'right' }}>{formatPct(r.confidence)}</td>
              <td><RiskScoreBadge score={r.riskScore} level={r.riskScore >= 70 ? 'critical' : r.riskScore >= 45 ? 'high' : r.riskScore >= 25 ? 'medium' : 'low'} /></td>
              <td className="tabular-nums" style={{ textAlign: 'right' }}>{formatPct(r.targetWeight)}</td>
              <td style={{ fontSize: '0.75rem', color: 'var(--color-muted-foreground)', maxWidth: '16rem' }}>{r.reasonShort}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Allocation matrix ────────────────────────────────────────────────────────

function AllocationMatrix({ allocations }: { allocations: PortfolioAllocation[] }) {
  if (allocations.length === 0) return <p className="text-muted">No allocations computed.</p>;
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="data-table" style={{ width: '100%' }}>
        <thead>
          <tr>
            <th scope="col" style={{ textAlign: 'left' }}>Symbol</th>
            <th scope="col" style={{ textAlign: 'right' }}>Current</th>
            <th scope="col" style={{ textAlign: 'right' }}>Target</th>
            <th scope="col" style={{ textAlign: 'right' }}>Delta</th>
            <th scope="col" style={{ textAlign: 'right' }}>Factor</th>
            <th scope="col" style={{ textAlign: 'right' }}>Risk</th>
            <th scope="col" style={{ textAlign: 'left' }}>Action</th>
            <th scope="col" style={{ textAlign: 'left' }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {allocations.map((alloc) => {
            const deltaTone = toneForDelta(alloc.deltaWeight);
            return (
              <tr key={alloc.symbol}>
                <td style={{ fontWeight: 600 }}>{alloc.symbol}</td>
                <td className="tabular-nums" style={{ textAlign: 'right' }}>{formatPct(alloc.currentWeight)}</td>
                <td className="tabular-nums" style={{ textAlign: 'right' }}>{formatPct(alloc.targetWeight)}</td>
                <td
                  className="tabular-nums"
                  style={{
                    textAlign: 'right',
                    color: deltaTone === 'positive' ? 'var(--color-success)' : deltaTone === 'negative' ? 'var(--color-destructive)' : undefined,
                  }}
                >
                  {alloc.deltaWeight >= 0 ? '+' : ''}{formatPct(alloc.deltaWeight)}
                </td>
                <td className="tabular-nums" style={{ textAlign: 'right' }}>{formatScore(alloc.factorDecomposition.normalizedScore)}</td>
                <td><RiskScoreBadge score={alloc.riskOverlay.riskScore} level={alloc.riskOverlay.riskLevel} /></td>
                <td>
                  <span className={`status-pill status-pill--${actionTone(alloc.suggestedAction)}`}>{alloc.suggestedAction}</span>
                </td>
                <td>
                  <span className="text-muted" style={{ fontSize: '0.75rem' }}>{alloc.recommendationAction}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Factor decomposition panel ───────────────────────────────────────────────

function FactorDecompositionPanel({ allocations }: { allocations: PortfolioAllocation[] }) {
  const active = allocations.filter((a) => a.targetWeight > 0);
  if (active.length === 0) return <p className="text-muted">No active allocations.</p>;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
      {active.map((alloc) => (
        <div key={alloc.symbol} style={{ border: '1px solid var(--color-border)', borderRadius: '0.5rem', padding: '0.875rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <strong style={{ fontSize: '0.875rem' }}>{alloc.symbol}</strong>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-muted-foreground)' }}>{alloc.assetClass}</span>
          </div>
          <FactorPanel alloc={alloc} />
        </div>
      ))}
    </div>
  );
}

// ─── Risk overlay panel ───────────────────────────────────────────────────────

function RiskOverlayPanel({ allocations }: { allocations: PortfolioAllocation[] }) {
  if (allocations.length === 0) return <p className="text-muted">No risk data available.</p>;
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="data-table" style={{ width: '100%' }}>
        <thead>
          <tr>
            <th scope="col" style={{ textAlign: 'left' }}>Symbol</th>
            <th scope="col" style={{ textAlign: 'left' }}>Risk level</th>
            <th scope="col" style={{ textAlign: 'right' }}>Score</th>
            <th scope="col" style={{ textAlign: 'right' }}>Vol.</th>
            <th scope="col" style={{ textAlign: 'right' }}>News</th>
            <th scope="col" style={{ textAlign: 'right' }}>Corr.</th>
            <th scope="col" style={{ textAlign: 'right' }}>Provider</th>
            <th scope="col" style={{ textAlign: 'left' }}>Dominant risks</th>
          </tr>
        </thead>
        <tbody>
          {allocations.map((alloc) => {
            const ro = alloc.riskOverlay;
            const dominantRisks = ro.explanation.slice(0, 2);
            return (
              <tr key={alloc.symbol}>
                <td style={{ fontWeight: 600 }}>{alloc.symbol}</td>
                <td>
                  <span className={`status-pill status-pill--${riskTone(ro.riskLevel) === 'negative' ? 'error' : riskTone(ro.riskLevel) === 'positive' ? 'success' : 'neutral'}`}>
                    {ro.riskLevel.toUpperCase()}
                  </span>
                </td>
                <td className="tabular-nums" style={{ textAlign: 'right' }}>{ro.riskScore.toFixed(0)}/100</td>
                <td className="tabular-nums" style={{ textAlign: 'right' }}>{formatPct(ro.volatilityRisk)}</td>
                <td className="tabular-nums" style={{ textAlign: 'right' }}>{formatPct(ro.newsRisk)}</td>
                <td className="tabular-nums" style={{ textAlign: 'right' }}>{formatPct(ro.correlationRisk)}</td>
                <td className="tabular-nums" style={{ textAlign: 'right' }}>{formatPct(ro.providerRisk)}</td>
                <td style={{ fontSize: '0.72rem', color: 'var(--color-muted-foreground)', maxWidth: '18rem' }}>
                  {dominantRisks.join('; ')}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Broker preview panel ─────────────────────────────────────────────────────

function BrokerPreviewRow({ symbol, side, decision }: { symbol: string; side: string; decision: BrokerDecision }) {
  return (
    <tr>
      <td style={{ fontWeight: 600 }}>{symbol}</td>
      <td>
        <span className={`status-pill status-pill--${side === 'buy' ? 'success' : 'warning'}`}>
          {side.toUpperCase()}
        </span>
      </td>
      <td className="tabular-nums" style={{ textAlign: 'right' }}>${decision.estimatedFillPrice.toFixed(4)}</td>
      <td className="tabular-nums" style={{ textAlign: 'right' }}>${decision.estimatedSlippage.toFixed(4)}</td>
      <td className="tabular-nums" style={{ textAlign: 'right' }}>${decision.estimatedSpreadImpact.toFixed(4)}</td>
      <td className="tabular-nums" style={{ textAlign: 'right' }}>${decision.estimatedFees.toFixed(4)}</td>
      <td>
        <span className={`status-pill status-pill--${decision.executable ? 'success' : 'error'}`}>
          {decision.executable ? 'Yes' : 'No'}
        </span>
      </td>
      <td className="tabular-nums" style={{ textAlign: 'right' }}>{decision.executionReadinessScore}/100</td>
      <td>
        <span className={`status-pill status-pill--${nextActionTone(decision.nextBestAction)}`}>
          {decision.nextBestAction}
        </span>
      </td>
      <td style={{ fontSize: '0.72rem', color: 'var(--color-muted-foreground)', maxWidth: '16rem' }}>
        {decision.blockingReasons.length > 0
          ? decision.blockingReasons[0]
          : decision.warningReasons[0] ?? '—'}
      </td>
    </tr>
  );
}

// ─── Diagnostics summary ──────────────────────────────────────────────────────

function DiagnosticsSummary({ diagnostics }: { diagnostics: PortfolioDiagnostics }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <ProgressBar label="Diversification" value={diagnostics.diversificationScore} tone={diagnostics.diversificationScore > 0.6 ? 'positive' : diagnostics.diversificationScore > 0.3 ? 'neutral' : 'negative'} />
      <ProgressBar label="Avg confidence" value={diagnostics.averageConfidence} tone={diagnostics.averageConfidence > 0.6 ? 'positive' : 'neutral'} />
      <ProgressBar label="Crypto exposure" value={diagnostics.cryptoExposure} tone={diagnostics.cryptoExposure > 0.4 ? 'negative' : 'neutral'} />
      <ProgressBar label="Equity exposure" value={diagnostics.equityExposure} tone="neutral" />
      <ProgressBar label="ETF exposure" value={diagnostics.etfExposure} tone="neutral" />
      <ProgressBar label="Cash target" value={diagnostics.cashTargetWeight} tone="neutral" />
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

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
  const { portfolioSummary, allocations, rebalancePlan, riskAlerts, diagnostics, ranking, regime } = intelligence;

  return (
    <>
      {/* ── 1. Hero / Command Header ─────────────────────────────────────── */}
      <Section className="dashboard-section dashboard-section--hero">
        <header className="dashboard-section-heading">
          <div>
            <div className="section__eyebrow">Portfolio Intelligence v2</div>
            <h2 className="dashboard-section-heading__title">Explainable Portfolio Decision Engine</h2>
            <p className="dashboard-section-heading__description">
              Deterministic allocation analysis — factor decomposition, risk overlay, regime awareness, and simulation-first broker preview.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span className={`status-pill status-pill--${vm.status === 'nominal' ? 'success' : 'warning'}`}>
              {vm.status}
            </span>
            <span className="status-pill status-pill--neutral">SIMULATION ONLY</span>
          </div>
        </header>

        {/* Safety notice — always visible */}
        <div className="alert alert--info" role="alert" aria-live="polite">
          <strong>Simulation only</strong> — {vm.simulationOnlyNotice} Live trading is permanently locked.
        </div>
      </Section>

      {/* ── 2. Portfolio Health Strip ─────────────────────────────────────── */}
      <Section className="dashboard-section">
        <div className="analytics-strip">
          <CompactStatCard
            label="Allocation health"
            value={diagnostics.allocationHealth.replace('-', ' ')}
            detail="Overall portfolio allocation quality."
            valueTone={diagnostics.allocationHealth === 'healthy' ? 'positive' : diagnostics.allocationHealth === 'high-risk' ? 'negative' : 'neutral'}
          />
          <CompactStatCard
            label="Diversification"
            value={formatPct(diagnostics.diversificationScore)}
            detail="Herfindahl-adjusted diversification score."
            valueTone={diagnostics.diversificationScore > 0.6 ? 'positive' : diagnostics.diversificationScore > 0.3 ? 'neutral' : 'negative'}
          />
          <CompactStatCard
            label="Avg confidence"
            value={formatPct(diagnostics.averageConfidence)}
            detail="Mean signal confidence across active allocations."
            valueTone={diagnostics.averageConfidence > 0.6 ? 'positive' : diagnostics.averageConfidence > 0.35 ? 'neutral' : 'negative'}
          />
          <CompactStatCard
            label="Avg risk score"
            value={`${diagnostics.averageRiskScore.toFixed(0)}/100`}
            detail="Mean composite risk score across all assets."
            valueTone={diagnostics.averageRiskScore > 60 ? 'negative' : diagnostics.averageRiskScore > 35 ? 'neutral' : 'positive'}
          />
          <CompactStatCard
            label="Crypto exposure"
            value={formatPct(diagnostics.cryptoExposure)}
            detail="Total crypto allocation target weight."
            valueTone={diagnostics.cryptoExposure > 0.4 ? 'negative' : 'neutral'}
          />
          <CompactStatCard
            label="Cash target"
            value={formatPct(diagnostics.cashTargetWeight)}
            detail="Estimated cash as percentage of portfolio."
          />
        </div>
      </Section>

      {/* Portfolio context stats */}
      <Section className="dashboard-section">
        <div className="analytics-strip">
          <CompactStatCard label="Portfolio value" value={formatUsd(portfolioContext.portfolioValue)} detail="Simulation portfolio total value." />
          <CompactStatCard label="Cash balance" value={formatUsd(portfolioContext.cashBalance)} detail="Available simulation cash." />
          <CompactStatCard label="Open positions" value={String(portfolioContext.openPositionCount)} detail="Currently active simulated positions." />
          <CompactStatCard label="Dominant class" value={portfolioSummary.dominantAssetClass} detail="Asset class with largest target allocation." />
          <CompactStatCard
            label="Concentration risk"
            value={portfolioSummary.concentrationRisk}
            detail="Single-asset concentration risk level."
            valueTone={riskTone(portfolioSummary.concentrationRisk)}
          />
        </div>
      </Section>

      {/* ── 3. Regime Awareness ──────────────────────────────────────────── */}
      <Section className="dashboard-section dashboard-section--tinted">
        <RegimePanel regime={regime} />
      </Section>

      {/* ── Diagnostics chart strip ───────────────────────────────────────── */}
      <Section className="dashboard-section">
        <Card className="analytics-card">
          <div className="analytics-card__header">
            <div>
              <div className="section__eyebrow">Portfolio diagnostics</div>
              <h3>Exposure and confidence breakdown</h3>
            </div>
          </div>
          <div className="analytics-card__body">
            <DiagnosticsSummary diagnostics={diagnostics} />
            {diagnostics.dominantRiskFactors[0] !== 'none' && (
              <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--color-muted-foreground)' }}>
                Dominant risk factors: {diagnostics.dominantRiskFactors.join(' · ')}
              </p>
            )}
          </div>
        </Card>
      </Section>

      {/* ── Risk alerts ──────────────────────────────────────────────────── */}
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

      {/* ── 4. Cross-Asset Ranking ───────────────────────────────────────── */}
      <Section className="dashboard-section">
        <Card className="analytics-card">
          <div className="analytics-card__header">
            <div>
              <div className="section__eyebrow">Cross-asset ranking</div>
              <h3>Assets ranked by target attractiveness</h3>
              <p>Sorted by factor-adjusted score descending. Lower risk breaks ties.</p>
            </div>
          </div>
          <div className="analytics-card__body">
            <RankingTable ranking={ranking} />
          </div>
        </Card>
      </Section>

      {/* ── 5. Allocation Matrix ─────────────────────────────────────────── */}
      <Section className="dashboard-section">
        <Card className="analytics-card">
          <div className="analytics-card__header">
            <div>
              <div className="section__eyebrow">Allocation matrix</div>
              <h3>Current vs target allocation</h3>
              <p>{portfolioSummary.explanation}</p>
            </div>
          </div>
          <div className="analytics-card__body">
            <AllocationMatrix allocations={allocations} />
          </div>
        </Card>
      </Section>

      {/* ── 6. Factor Decomposition ──────────────────────────────────────── */}
      <Section className="dashboard-section dashboard-section--tinted">
        <Card className="analytics-card">
          <div className="analytics-card__header">
            <div>
              <div className="section__eyebrow">Factor decomposition</div>
              <h3>Per-asset score driver breakdown</h3>
              <p>Each bar shows the contribution or penalty each factor applied to the final allocation score.</p>
            </div>
          </div>
          <div className="analytics-card__body">
            <FactorDecompositionPanel allocations={allocations} />
          </div>
        </Card>
      </Section>

      {/* ── 7. Risk Overlay Panel ────────────────────────────────────────── */}
      <Section className="dashboard-section">
        <Card className="analytics-card">
          <div className="analytics-card__header">
            <div>
              <div className="section__eyebrow">Risk overlay</div>
              <h3>Per-asset composite risk scores</h3>
              <p>Volatility, news, correlation, and provider reliability components combined into a 0–100 risk score.</p>
            </div>
          </div>
          <div className="analytics-card__body">
            <RiskOverlayPanel allocations={allocations} />
          </div>
        </Card>
      </Section>

      {/* ── 8. Rebalance Plan ────────────────────────────────────────────── */}
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
                        {trade.reasoning.slice(0, 120)}{trade.reasoning.length > 120 ? '…' : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </Section>

      {/* ── 9. Broker Preview Panel ─────────────────────────────────────── */}
      <Section className="dashboard-section">
        <Card className="analytics-card">
          <div className="analytics-card__header">
            <div>
              <div className="section__eyebrow">Broker preview</div>
              <h3>Execution quality estimates</h3>
              <p>
                Simulation-mode execution preview. Fill prices, slippage, and fees are estimates only.
                Live execution is permanently locked.
              </p>
            </div>
            <span className={`status-pill status-pill--${brokerReadiness.ready ? 'success' : 'warning'}`}>
              {brokerReadiness.ready ? 'Broker ready' : 'Broker not ready'}
            </span>
          </div>
          <div className="analytics-card__body">
            <p className="text-muted" style={{ marginBottom: '1rem' }}>
              {brokerReadiness.summary}
            </p>
            {brokerPreviews.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th scope="col" style={{ textAlign: 'left' }}>Symbol</th>
                      <th scope="col" style={{ textAlign: 'left' }}>Side</th>
                      <th scope="col" style={{ textAlign: 'right' }}>Est. fill</th>
                      <th scope="col" style={{ textAlign: 'right' }}>Slippage</th>
                      <th scope="col" style={{ textAlign: 'right' }}>Spread</th>
                      <th scope="col" style={{ textAlign: 'right' }}>Fees</th>
                      <th scope="col" style={{ textAlign: 'left' }}>Executable</th>
                      <th scope="col" style={{ textAlign: 'right' }}>Readiness</th>
                      <th scope="col" style={{ textAlign: 'left' }}>Next action</th>
                      <th scope="col" style={{ textAlign: 'left' }}>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {brokerPreviews.map(({ symbol, side, decision }) => (
                      <BrokerPreviewRow key={symbol} symbol={symbol} side={side} decision={decision} />
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted">No rebalance trades to preview.</p>
            )}
          </div>
        </Card>
      </Section>

      {/* ── 10. Explanation / Audit Trail ────────────────────────────────── */}
      <Section className="dashboard-section dashboard-section--tinted">
        <Card className="analytics-card">
          <div className="analytics-card__header">
            <div>
              <div className="section__eyebrow">Intelligence explanation</div>
              <h3>Why these allocations?</h3>
            </div>
          </div>
          <div className="analytics-card__body">
            <p>{intelligence.explanation}</p>
            <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.75rem' }}>
              {[
                { label: 'Rules engine', value: 'Deterministic factor scoring — no black-box models.' },
                { label: 'Live execution', value: 'Permanently locked. All output is simulation only.' },
                { label: 'Risk gates', value: 'Max position weight, crypto cap, min threshold, correlation penalty.' },
                { label: 'Allocation constraints', value: `Max weight: 20%. Min weight: 2%. Crypto cap: 25%. Rebalance threshold: 5%.` },
                { label: 'Regime detection', value: `Based on signal aggregation — fallback to "unknown" on low confidence.` },
                { label: 'Data freshness', value: 'Allocations derived from the most recent available signal data.' },
              ].map(({ label, value }) => (
                <div key={label} style={{ border: '1px solid var(--color-border)', borderRadius: '0.5rem', padding: '0.75rem' }}>
                  <p style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-muted-foreground)', margin: 0 }}>{label}</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-foreground)', margin: '0.25rem 0 0' }}>{value}</p>
                </div>
              ))}
            </div>
            <p className="text-muted" style={{ marginTop: '1rem', fontSize: '0.75rem' }}>
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

      {/* ── Simulation CTA ───────────────────────────────────────────────── */}
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
