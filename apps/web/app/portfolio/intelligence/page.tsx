import Link from 'next/link';
import { requireCurrentSession } from '../../../server/auth/session';
import { getPortfolioIntelligenceViewModel } from '../../../server/services/portfolio-intelligence-service';
import { Section } from '../../../components/ui/section';
import { Card } from '../../../components/ui/card';
import { Disclosure } from '../../../components/ui/disclosure';
import { IntelligenceAnalysisTabs } from '../../../components/portfolio/intelligence-analysis-tabs';
import type {
  PortfolioAllocation,
  AssetRanking,
  RegimeAwareness,
  PortfolioDiagnostics,
} from '@repo/ai-market-intelligence';
import type { BrokerDecision } from '@repo/agents';
import { buildSimulationPrepareHrefForAsset } from '../../../lib/simulation-prepare-url';
import { getMessages } from '../../../lib/i18n/messages';
import { getRequestLocale } from '../../../server/i18n/locale';
import type { AppMessages } from '../../../lib/i18n/messages';

type IntelMessages = AppMessages['portfolioIntelligence'];

export const dynamic = 'force-dynamic';
const MAX_VISIBLE_PORTFOLIO_ROWS = 25;

//  Formatters 

function formatPct(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

function formatCurrency(value: number, currency: 'USD' | 'EUR'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
}

function formatNormalizedScore(value: number): string {
  return `${(value * 100).toFixed(1)}`;
}

function formatAttractiveness(value: number): string {
  return value.toFixed(1);
}

function buildPrepareTradeHref(input: {
  symbol: string;
  assetClass: 'stock' | 'etf' | 'crypto' | 'other';
  side: 'BUY' | 'SELL';
  source: string;
}) {
  const normalizedAssetClass = input.assetClass === 'other' ? 'stock' : input.assetClass;
  return buildSimulationPrepareHrefForAsset({
    symbol: input.symbol,
    assetClass: normalizedAssetClass,
    side: input.side === 'SELL' ? 'sell' : 'buy',
    source: input.source,
  });
}

//  Tone helpers 

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

//  Inline bar chart 

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

//  Factor decomposition mini-panel 

function FactorPanel({ alloc, messages }: { alloc: PortfolioAllocation; messages: IntelMessages }) {
  const fd = alloc.factorDecomposition;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
      <ProgressBar label={messages.factorMomentum} value={fd.momentumContribution} tone="positive" />
      <ProgressBar label={messages.factorConfidence} value={fd.confidenceContribution} tone="positive" />
      {fd.volatilityPenalty > 0 && <ProgressBar label={messages.factorVolatility} value={fd.volatilityPenalty} tone="negative" />}
      {fd.newsRiskPenalty > 0 && <ProgressBar label={messages.factorNewsRisk} value={fd.newsRiskPenalty} tone="negative" />}
      {fd.providerReliabilityPenalty > 0 && <ProgressBar label={messages.factorProvider} value={fd.providerReliabilityPenalty} tone="negative" />}
      {fd.correlationPenalty > 0 && <ProgressBar label={messages.factorCorrelation} value={fd.correlationPenalty} tone="negative" />}
      <ProgressBar label={messages.factorFinalScore} value={fd.normalizedScore} tone="neutral" />
    </div>
  );
}

//  Risk score badge 

function RiskScoreBadge({ score, level }: { score: number; level: string }) {
  const tone = level === 'critical' ? 'error' : level === 'high' ? 'warning' : level === 'low' ? 'success' : 'neutral';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
      <span className={`status-pill status-pill--${tone}`}>{level.toUpperCase()}</span>
      <span className="tabular-nums" style={{ fontSize: '0.75rem', color: 'var(--color-muted-foreground)' }}>{score.toFixed(0)}/100</span>
    </span>
  );
}

//  Regime panel 

function RegimePanel({ regime, messages }: { regime: RegimeAwareness; messages: IntelMessages }) {
  const tone = regimeTone(regime.regime);
  return (
    <Card className="analytics-card">
      <div className="analytics-card__header">
        <div>
          <div className="section__eyebrow">{messages.regimeEyebrow}</div>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span className={`status-pill status-pill--${tone}`}>{regime.regime.toUpperCase()}</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 400, color: 'var(--color-muted-foreground)' }}>
              {(regime.confidence * 100).toFixed(0)}{messages.confidenceSuffix}
            </span>
          </h3>
        </div>
      </div>
      <div className="analytics-card__body">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-muted-foreground)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{messages.evidenceLabel}</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {regime.evidence.map((e, i) => (
                <li key={i} style={{ fontSize: '0.8rem', color: 'var(--color-foreground)' }}> {e}</li>
              ))}
            </ul>
          </div>
          <div>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-muted-foreground)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{messages.allocationBiasLabel}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <ProgressBar label={messages.biasRiskOn} value={regime.allocationBias.riskOn} tone={regime.allocationBias.riskOn > 0.5 ? 'positive' : 'neutral'} />
              <ProgressBar label={messages.biasCashPref} value={regime.allocationBias.cashPreference} tone="neutral" />
              <ProgressBar label={messages.biasEquityPref} value={regime.allocationBias.equityPreference} tone="neutral" />
              <ProgressBar label={messages.biasCryptoPref} value={regime.allocationBias.cryptoPreference} tone="neutral" />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function MacroOverlayPanel({ macroScore, confidence, explanation, messages }: { macroScore: number; confidence: number; explanation: string; messages: IntelMessages }) {
  const tone = macroScore > 0.15 ? 'success' : macroScore < -0.15 ? 'error' : 'warning';
  return (
    <article className="analytics-card">
      <div className="analytics-card__header">
        <div>
          <div className="section__eyebrow">{messages.macroEyebrow}</div>
          <h3>{messages.macroTitle}</h3>
          <p>{explanation}</p>
        </div>
      </div>
      <div className="analytics-card__body">
        <div className="observation-regime-grid">
          <article className="analytics-card observation-regime-card"><div className="analytics-stat__label">{messages.macroScoreLabel}</div><div className="analytics-stat__value">{macroScore.toFixed(2)}</div></article>
          <article className="analytics-card observation-regime-card"><div className="analytics-stat__label">{messages.macroConfidenceLabel}</div><div className="analytics-stat__value">{(confidence * 100).toFixed(0)}%</div></article>
          <article className="analytics-card observation-regime-card"><div className="analytics-stat__label">{messages.macroRiskToneLabel}</div><div className={`status-pill status-pill--${tone}`}>{tone.toUpperCase()}</div></article>
        </div>
      </div>
    </article>
  );
}

//  Ranking table 

function RankingTable({ ranking, messages }: { ranking: AssetRanking[]; messages: IntelMessages }) {
  if (ranking.length === 0) return <p className="text-muted">{messages.rankingEmpty}</p>;
  const visibleRanking = ranking.slice(0, MAX_VISIBLE_PORTFOLIO_ROWS);
  return (
    <div style={{ overflowX: 'auto' }}>
      <p className="text-muted" style={{ marginBottom: '0.5rem' }}>
        {messages.showingTopRows.replace('{{max}}', String(MAX_VISIBLE_PORTFOLIO_ROWS)).replace('{{total}}', String(ranking.length))}
      </p>
      <table className="data-table" style={{ width: '100%' }}>
        <thead>
          <tr>
            <th scope="col" style={{ textAlign: 'right', width: '2.5rem' }}>{messages.colRank}</th>
            <th scope="col" style={{ textAlign: 'left' }}>{messages.colAsset}</th>
            <th scope="col" style={{ textAlign: 'left' }}>{messages.colClass}</th>
            <th scope="col" style={{ textAlign: 'left' }}>{messages.colSignal}</th>
            <th scope="col" style={{ textAlign: 'right' }}>{messages.colScore}</th>
            <th scope="col" style={{ textAlign: 'right' }}>{messages.colConfidence}</th>
            <th scope="col" style={{ textAlign: 'right' }}>{messages.colRisk}</th>
            <th scope="col" style={{ textAlign: 'right' }}>{messages.colTarget}</th>
            <th scope="col" style={{ textAlign: 'left' }}>{messages.colReason}</th>
            <th scope="col" style={{ textAlign: 'left' }}>{messages.colAction}</th>
          </tr>
        </thead>
        <tbody>
          {visibleRanking.map((r) => (
            <tr key={r.symbol}>
              <td className="tabular-nums" style={{ textAlign: 'right', color: 'var(--color-muted-foreground)', fontVariantNumeric: 'tabular-nums' }}>{r.rank}</td>
              <td style={{ fontWeight: 600 }}>{r.symbol}</td>
              <td><span className="status-pill status-pill--neutral" style={{ fontSize: '0.65rem' }}>{r.assetClass}</span></td>
              <td><span className={`status-pill status-pill--${r.recommendation.includes('BUY') ? 'success' : r.recommendation.includes('SELL') || r.recommendation === 'AVOID' ? 'error' : 'neutral'}`}>{r.recommendation}</span></td>
              <td className="tabular-nums" style={{ textAlign: 'right' }}>{formatAttractiveness(r.finalScore)}</td>
              <td className="tabular-nums" style={{ textAlign: 'right' }}>{formatPct(r.confidence)}</td>
              <td><RiskScoreBadge score={r.riskScore} level={r.riskScore >= 70 ? 'critical' : r.riskScore >= 45 ? 'high' : r.riskScore >= 25 ? 'medium' : 'low'} /></td>
              <td className="tabular-nums" style={{ textAlign: 'right' }}>{formatPct(r.targetWeight)}</td>
              <td style={{ fontSize: '0.75rem', color: 'var(--color-muted-foreground)', maxWidth: '16rem' }}>{r.reasonShort}</td>
              <td>
                <Link className="button button--secondary" href={buildPrepareTradeHref({ symbol: r.symbol, assetClass: r.assetClass, side: r.recommendation.includes('SELL') ? 'SELL' : 'BUY', source: 'portfolio-intelligence' })}>
                  {r.recommendation.includes('SELL') ? messages.prepareSell : messages.prepareBuy}
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

//  Allocation matrix 

function AllocationMatrix({ allocations, messages }: { allocations: PortfolioAllocation[]; messages: IntelMessages }) {
  if (allocations.length === 0) return <p className="text-muted">{messages.allocationsEmpty}</p>;
  const visibleAllocations = allocations.slice(0, MAX_VISIBLE_PORTFOLIO_ROWS);
  return (
    <div style={{ overflowX: 'auto' }}>
      <p className="text-muted" style={{ marginBottom: '0.5rem' }}>
        {messages.showingTopRows.replace('{{max}}', String(MAX_VISIBLE_PORTFOLIO_ROWS)).replace('{{total}}', String(allocations.length))}
      </p>
      <table className="data-table" style={{ width: '100%' }}>
        <thead>
          <tr>
            <th scope="col" style={{ textAlign: 'left' }}>{messages.colSymbol}</th>
            <th scope="col" style={{ textAlign: 'right' }}>{messages.colCurrent}</th>
            <th scope="col" style={{ textAlign: 'right' }}>{messages.colTarget}</th>
            <th scope="col" style={{ textAlign: 'right' }}>{messages.colDelta}</th>
            <th scope="col" style={{ textAlign: 'right' }}>{messages.colFactor}</th>
            <th scope="col" style={{ textAlign: 'right' }}>{messages.colRisk}</th>
            <th scope="col" style={{ textAlign: 'left' }}>{messages.colAction}</th>
            <th scope="col" style={{ textAlign: 'left' }}>{messages.colStatus}</th>
            <th scope="col" style={{ textAlign: 'left' }}>{messages.colAction}</th>
          </tr>
        </thead>
        <tbody>
          {visibleAllocations.map((alloc) => {
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
                <td className="tabular-nums" style={{ textAlign: 'right' }}>{formatNormalizedScore(alloc.factorDecomposition.normalizedScore)}</td>
                <td><RiskScoreBadge score={alloc.riskOverlay.riskScore} level={alloc.riskOverlay.riskLevel} /></td>
                <td>
                  <span className={`status-pill status-pill--${actionTone(alloc.suggestedAction)}`}>{alloc.suggestedAction}</span>
                </td>
                <td>
                  <span className="text-muted" style={{ fontSize: '0.75rem' }}>{alloc.recommendationAction}</span>
                </td>
                <td>
                  <Link className="button button--secondary" href={buildPrepareTradeHref({ symbol: alloc.symbol, assetClass: alloc.assetClass, side: alloc.deltaWeight < 0 ? 'SELL' : 'BUY', source: 'portfolio-intelligence' })}>
                    {alloc.deltaWeight < 0 ? messages.reduceClose : messages.prepareBuy}
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

//  Factor decomposition panel 

function FactorDecompositionPanel({ allocations, messages }: { allocations: PortfolioAllocation[]; messages: IntelMessages }) {
  const active = allocations.filter((a) => a.targetWeight > 0);
  if (active.length === 0) return <p className="text-muted">{messages.noActiveAllocations}</p>;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
      {active.map((alloc) => (
        <div key={alloc.symbol} style={{ border: '1px solid var(--color-border)', borderRadius: '0.5rem', padding: '0.875rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <strong style={{ fontSize: '0.875rem' }}>{alloc.symbol}</strong>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-muted-foreground)' }}>{alloc.assetClass}</span>
          </div>
          <FactorPanel alloc={alloc} messages={messages} />
        </div>
      ))}
    </div>
  );
}

//  Risk overlay panel 

function RiskOverlayPanel({ allocations, messages }: { allocations: PortfolioAllocation[]; messages: IntelMessages }) {
  if (allocations.length === 0) return <p className="text-muted">{messages.riskDataEmpty}</p>;
  const visibleAllocations = allocations.slice(0, MAX_VISIBLE_PORTFOLIO_ROWS);
  return (
    <div style={{ overflowX: 'auto' }}>
      <p className="text-muted" style={{ marginBottom: '0.5rem' }}>
        {messages.showingTopRows.replace('{{max}}', String(MAX_VISIBLE_PORTFOLIO_ROWS)).replace('{{total}}', String(allocations.length))}
      </p>
      <table className="data-table" style={{ width: '100%' }}>
        <thead>
          <tr>
            <th scope="col" style={{ textAlign: 'left' }}>{messages.colSymbol}</th>
            <th scope="col" style={{ textAlign: 'left' }}>{messages.colRiskLevel}</th>
            <th scope="col" style={{ textAlign: 'right' }}>{messages.colScore}</th>
            <th scope="col" style={{ textAlign: 'right' }}>{messages.colVol}</th>
            <th scope="col" style={{ textAlign: 'right' }}>{messages.colNews}</th>
            <th scope="col" style={{ textAlign: 'right' }}>{messages.colCorr}</th>
            <th scope="col" style={{ textAlign: 'right' }}>{messages.colProvider}</th>
            <th scope="col" style={{ textAlign: 'left' }}>{messages.colDominantRisks}</th>
          </tr>
        </thead>
        <tbody>
          {visibleAllocations.map((alloc) => {
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

//  Broker preview panel 

function BrokerPreviewRow({ symbol, side, decision, messages }: { symbol: string; side: string; decision: BrokerDecision; messages: IntelMessages }) {
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
          {decision.executable ? messages.executableYes : messages.executableNo}
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
          : decision.warningReasons[0] ?? ''}
      </td>
    </tr>
  );
}

//  Diagnostics summary 

function DiagnosticsSummary({ diagnostics, messages }: { diagnostics: PortfolioDiagnostics; messages: IntelMessages }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <ProgressBar label={messages.diagDiversification} value={diagnostics.diversificationScore} tone={diagnostics.diversificationScore > 0.6 ? 'positive' : diagnostics.diversificationScore > 0.3 ? 'neutral' : 'negative'} />
      <ProgressBar label={messages.diagAvgConfidence} value={diagnostics.averageConfidence} tone={diagnostics.averageConfidence > 0.6 ? 'positive' : 'neutral'} />
      <ProgressBar label={messages.diagCryptoExposure} value={diagnostics.cryptoExposure} tone={diagnostics.cryptoExposure > 0.4 ? 'negative' : 'neutral'} />
      <ProgressBar label={messages.diagEquityExposure} value={diagnostics.equityExposure} tone="neutral" />
      <ProgressBar label={messages.diagEtfExposure} value={diagnostics.etfExposure} tone="neutral" />
      <ProgressBar label={messages.diagCashTarget} value={diagnostics.cashTargetWeight} tone="neutral" />
    </div>
  );
}

function BrokerPreviewCard({
  brokerReadiness,
  brokerPreviews,
  messages,
}: {
  brokerReadiness: { ready: boolean; summary: string };
  brokerPreviews: Array<{ symbol: string; side: 'buy' | 'sell'; decision: BrokerDecision }>;
  messages: IntelMessages;
}) {
  return (
    <Card className="analytics-card">
        <div className="analytics-card__header">
          <div>
            <div className="section__eyebrow">{messages.brokerEyebrow}</div>
            <h3>{messages.brokerTitle}</h3>
            <p>{messages.brokerDescription}</p>
          </div>
          <span className={`status-pill status-pill--${brokerReadiness.ready ? 'success' : 'warning'}`}>
            {brokerReadiness.ready ? messages.brokerReady : messages.brokerNotReady}
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
                    <th scope="col" style={{ textAlign: 'left' }}>{messages.colSymbol}</th>
                    <th scope="col" style={{ textAlign: 'left' }}>{messages.colSide}</th>
                    <th scope="col" style={{ textAlign: 'right' }}>{messages.colEstFill}</th>
                    <th scope="col" style={{ textAlign: 'right' }}>{messages.colSlippage}</th>
                    <th scope="col" style={{ textAlign: 'right' }}>{messages.colSpread}</th>
                    <th scope="col" style={{ textAlign: 'right' }}>{messages.colFees}</th>
                    <th scope="col" style={{ textAlign: 'left' }}>{messages.colExecutable}</th>
                    <th scope="col" style={{ textAlign: 'right' }}>{messages.colReadiness}</th>
                    <th scope="col" style={{ textAlign: 'left' }}>{messages.colNextAction}</th>
                    <th scope="col" style={{ textAlign: 'left' }}>{messages.colNotes}</th>
                  </tr>
                </thead>
                <tbody>
                  {brokerPreviews.map(({ symbol, side, decision }) => (
                    <BrokerPreviewRow key={symbol} symbol={symbol} side={side} decision={decision} messages={messages} />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-muted">{messages.noRebalanceToPreview}</p>
          )}
        </div>
    </Card>
  );
}

function ExplanationCard({ explanation, messages }: { explanation: string; messages: IntelMessages }) {
  return (
    <Card className="analytics-card">
        <div className="analytics-card__header">
          <div>
            <div className="section__eyebrow">{messages.explanationEyebrow}</div>
            <h3>{messages.explanationTitle}</h3>
          </div>
        </div>
        <div className="analytics-card__body">
          <p>{explanation}</p>
          <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.75rem' }}>
            {[
              { label: messages.explRulesEngineLabel, value: messages.explRulesEngineValue },
              { label: messages.explLiveExecutionLabel, value: messages.explLiveExecutionValue },
              { label: messages.explRiskGatesLabel, value: messages.explRiskGatesValue },
              { label: messages.explAllocationConstraintsLabel, value: messages.explAllocationConstraintsValue },
              { label: messages.explRegimeDetectionLabel, value: messages.explRegimeDetectionValue },
              { label: messages.explDataFreshnessLabel, value: messages.explDataFreshnessValue },
            ].map(({ label, value }) => (
              <div key={label} style={{ border: '1px solid var(--color-border)', borderRadius: '0.5rem', padding: '0.75rem' }}>
                <p style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-muted-foreground)', margin: 0 }}>{label}</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-foreground)', margin: '0.25rem 0 0' }}>{value}</p>
              </div>
            ))}
          </div>
          <p className="text-muted" style={{ marginTop: '1rem', fontSize: '0.75rem' }}>
            {messages.explanationFootnote}
          </p>
          <p className="text-muted" style={{ marginTop: '0.5rem', fontSize: '0.75rem' }}>
            {messages.explanationDisclaimer}
          </p>
        </div>
    </Card>
  );
}

function ExecutePlanActions({ messages }: { messages: IntelMessages }) {
  return (
      <Card className="analytics-card">
        <div className="analytics-card__header">
          <div>
            <div className="section__eyebrow">{messages.executeEyebrow}</div>
            <h3>{messages.executeTitle}</h3>
            <p>
              {messages.executeDescriptionPrefix}
              <strong>{messages.executeDescriptionEmphasis}</strong>
            </p>
          </div>
        </div>
        <div className="analytics-card__action-grid">
          <Link href="/invest/simulation" className="button button--primary">
            {messages.openSimulationWorkstation}
          </Link>
          <Link href="/portfolio" className="button button--secondary">
            {messages.backToPortfolioOverview}
          </Link>
          <Link href="/markets/intelligence" className="button button--secondary">
            {messages.viewMarketIntelligence}
          </Link>
        </div>
        <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--color-muted)', borderRadius: '0.375rem' }}>
          <p style={{ fontSize: '0.75rem', margin: 0, color: 'var(--color-muted-foreground)' }}>
            {messages.executeNote}
          </p>
        </div>
    </Card>
  );
}

//  Page 

export default async function PortfolioIntelligencePage() {
  await requireCurrentSession('/login');
  const locale = await getRequestLocale();
  const messages = getMessages(locale);
  const t = messages.portfolioIntelligence;
  const vm = await getPortfolioIntelligenceViewModel();

  if (vm.status === 'empty') {
    return (
      <Section className="dashboard-section">
        <Card className="analytics-card">
          <div className="analytics-card__header">
            <div>
              <div className="section__eyebrow">{t.emptyEyebrow}</div>
              <h3>{t.emptyTitle}</h3>
              <p>{vm.statusReason}</p>
            </div>
          </div>
          <div className="analytics-card__action-grid">
            <Link href="/markets/intelligence" className="button button--primary">
              {t.viewMarketIntelligence}
            </Link>
            <Link href="/invest" className="button button--secondary">
              {t.browseAssets}
            </Link>
          </div>
        </Card>
      </Section>
    );
  }

  const { intelligence, brokerReadiness, brokerPreviews, portfolioContext, newsExposure } = vm;
  const { portfolioSummary, allocations, rebalancePlan, riskAlerts, diagnostics, ranking, regime } = intelligence;
  const macro = vm.macroContext.regime;
  const top25AvgConfidence = ranking.length > 0
    ? ranking.slice(0, 25).reduce((sum, item) => sum + item.confidence, 0) / Math.min(25, ranking.length)
    : 0;
  const hasActivePortfolio = portfolioContext.state === 'active-portfolio';

  return (
    <>
      {/* ── Compact Command Header ── */}
      <header className="observe-command-header">
        <div className="observe-command-header__inner">
          <div className="observe-command-header__top">
            <div className="observe-command-header__identity">
              <span className="observe-command-header__eyebrow">{t.headerEyebrow}</span>
              <h1 className="observe-command-header__title">{t.headerTitle}</h1>
              <p className="observe-command-header__sub">
                {t.headerSub}
              </p>
            </div>
            <div className="observe-command-header__chips">
              <span className={`observe-chip observe-chip--${vm.status === 'nominal' ? 'success' : 'warning'}`} title={t.chipStatusTitle}>
                {vm.status.toUpperCase()}
              </span>
              <span className="observe-chip observe-chip--neutral" title={t.chipRegimeTitle}>
                {regime.regime.toUpperCase()}
              </span>
              <span className="observe-chip observe-chip--neutral" title={t.chipRankedAssetsTitle}>
                {ranking.length}{t.chipAssetsSuffix}
              </span>
              {riskAlerts.length > 0 && (
                <span className="observe-chip observe-chip--danger" title={t.chipRiskAlertsTitle}>
                  {riskAlerts.length} {riskAlerts.length !== 1 ? t.chipRiskAlertPlural : t.chipRiskAlertSingular}
                </span>
              )}
              <span className="observe-chip observe-chip--info" title={t.chipSimOnlyTitle}>
                {t.chipSimOnly}
              </span>
            </div>
          </div>
          <nav className="observe-command-header__actions" aria-label={t.headerActionsAria}>
            <Link href="/observe" className="button button--secondary observe-command-action">{t.navObserver}</Link>
            <Link href="/signals" className="button button--secondary observe-command-action">{t.navSignals}</Link>
            <Link href="/invest/simulation" className="button button--secondary observe-command-action">{t.navSimulation}</Link>
            <Link href="/portfolio" className="button button--secondary observe-command-action">{t.navPortfolio}</Link>
            <Link href="/alerts" className="button button--secondary observe-command-action">{t.navAlerts}</Link>
          </nav>
        </div>
      </header>

      {/* ── Simulation Safety Banner ── */}
      <div className="sim-safety-banner" role="status" aria-label={t.safetyBannerAria}>
        {/* Shield icon — inline SVG avoids external deps and hydration mismatch */}
        <svg
          className="sim-safety-banner__icon"
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden="true"
          focusable="false"
        >
          <path
            d="M10 2L3 5v5c0 4.418 3.134 8.147 7 9 3.866-.853 7-4.582 7-9V5l-7-3z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
            fill="none"
          />
          <path
            d="M7.5 10l1.75 1.75L12.5 8"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <div className="sim-safety-banner__body">
          <p className="sim-safety-banner__title">
            {vm.simulationOnlyNotice}
          </p>
          <div className="sim-safety-banner__pills" aria-label={t.safetyConstraintsAria}>
            <span className="sim-safety-banner__pill sim-safety-banner__pill--sim">
              {t.safetySimulationMode}
            </span>
            <span className="sim-safety-banner__pill sim-safety-banner__pill--locked">
              {t.safetyLiveLocked}
            </span>
            <span className="sim-safety-banner__pill sim-safety-banner__pill--safe">
              {t.safetyNoCapital}
            </span>
          </div>
        </div>
      </div>

      {/* ── KPI Grid — grouped by category ── */}
      <section className="intel-kpi-grid" aria-label={t.kpiMetricsAria}>

        {/* Group 1 — Portfolio State */}
        <div className="intel-kpi-group-label" aria-hidden="true">{t.kpiGroupPortfolioState}</div>

        {/* Portfolio Value — primary */}
        <article
          className="intel-kpi-card intel-kpi-card--primary"
          aria-label={t.kpiPortfolioValueAria.replace('{{value}}', formatCurrency(portfolioContext.portfolioValue, portfolioContext.baseCurrency))}
        >
          <div className="intel-kpi-card__label">{t.kpiPortfolioValueLabel}</div>
          <div className="intel-kpi-card__value">{formatCurrency(portfolioContext.portfolioValue, portfolioContext.baseCurrency)}</div>
          <div className="intel-kpi-card__desc">{t.kpiPortfolioValueDesc}</div>
        </article>

        {/* Cash — primary */}
        <article
          className="intel-kpi-card intel-kpi-card--primary"
          aria-label={t.kpiCashAria.replace('{{value}}', formatCurrency(portfolioContext.cashBalance, portfolioContext.baseCurrency))}
        >
          <div className="intel-kpi-card__label">{t.kpiCashLabel}</div>
          <div className="intel-kpi-card__value">{formatCurrency(portfolioContext.cashBalance, portfolioContext.baseCurrency)}</div>
          <div className="intel-kpi-card__desc">{t.kpiCashDesc}</div>
        </article>

        {/* Open Positions — primary */}
        <article
          className="intel-kpi-card intel-kpi-card--primary"
          aria-label={t.kpiPositionsAria.replace('{{count}}', String(portfolioContext.openPositionCount))}
        >
          <div className="intel-kpi-card__label">{t.kpiPositionsLabel}</div>
          <div className="intel-kpi-card__value">{portfolioContext.openPositionCount}</div>
          <div className="intel-kpi-card__desc">{t.kpiPositionsDesc}</div>
        </article>

        {/* Health — primary */}
        {(() => {
          const healthVariant =
            diagnostics.allocationHealth === 'healthy' ? 'success' :
            diagnostics.allocationHealth === 'high-risk' ? 'danger' : 'warning';
          return (
            <article
              className={`intel-kpi-card intel-kpi-card--primary intel-kpi-card--${healthVariant}`}
              aria-label={t.kpiHealthAria.replace('{{health}}', diagnostics.allocationHealth.replace('-', ' '))}
            >
              <div className="intel-kpi-card__label">{t.kpiHealthLabel}</div>
              <div className="intel-kpi-card__value" style={{ textTransform: 'capitalize' }}>
                {diagnostics.allocationHealth.replace('-', ' ')}
              </div>
              <div className="intel-kpi-card__desc">{t.kpiHealthDesc}</div>
            </article>
          );
        })()}

        {/* Spacer to keep 5-col row balanced on desktop */}
        <div aria-hidden="true" style={{ display: 'contents' }} />

        {/* Group 2 — Risk & Confidence */}
        <div className="intel-kpi-group-label" aria-hidden="true">{t.kpiGroupRiskConfidence}</div>

        {/* Avg Confidence */}
        {(() => {
          const confValue = hasActivePortfolio ? diagnostics.averageConfidence : top25AvgConfidence;
          const confVariant = confValue > 0.6 ? 'success' : confValue > 0.35 ? '' : 'warning';
          return (
            <article
              className={`intel-kpi-card${confVariant ? ` intel-kpi-card--${confVariant}` : ''}`}
              aria-label={t.kpiAvgConfidenceAria.replace('{{value}}', formatPct(confValue))}
            >
              <div className="intel-kpi-card__label">{t.kpiAvgConfidenceLabel}</div>
              <div className="intel-kpi-card__value">{formatPct(confValue)}</div>
              <div className="intel-kpi-card__desc">
                {hasActivePortfolio ? t.kpiAvgConfidenceDescPortfolio : t.kpiAvgConfidenceDescTop25}
              </div>
            </article>
          );
        })()}

        {/* Avg Risk */}
        {(() => {
          const riskVariant =
            diagnostics.averageRiskScore > 60 ? 'danger' :
            diagnostics.averageRiskScore > 35 ? 'warning' : 'success';
          return (
            <article
              className={`intel-kpi-card intel-kpi-card--${riskVariant}`}
              aria-label={t.kpiAvgRiskAria.replace('{{value}}', diagnostics.averageRiskScore.toFixed(0))}
            >
              <div className="intel-kpi-card__label">{t.kpiAvgRiskLabel}</div>
              <div className="intel-kpi-card__value">{diagnostics.averageRiskScore.toFixed(0)}<span style={{ fontSize: '0.75em', fontWeight: 400, color: 'var(--text-tertiary)' }}>/100</span></div>
              <div className="intel-kpi-card__desc">{t.kpiAvgRiskDesc}</div>
            </article>
          );
        })()}

        {/* Diversification */}
        {(() => {
          const divVariant =
            diagnostics.diversificationScore > 0.6 ? 'success' :
            diagnostics.diversificationScore > 0.3 ? '' : 'danger';
          return (
            <article
              className={`intel-kpi-card${divVariant ? ` intel-kpi-card--${divVariant}` : ''}`}
              aria-label={t.kpiDiversificationAria.replace('{{value}}', formatPct(diagnostics.diversificationScore))}
            >
              <div className="intel-kpi-card__label">{t.kpiDiversificationLabel}</div>
              <div className="intel-kpi-card__value">{formatPct(diagnostics.diversificationScore)}</div>
              <div className="intel-kpi-card__desc">{t.kpiDiversificationDesc}</div>
            </article>
          );
        })()}

        {/* News Risk */}
        {(() => {
          const newsVariant =
            newsExposure.maxRisk > 75 ? 'danger' :
            newsExposure.maxRisk > 55 ? 'warning' : '';
          return (
            <article
              className={`intel-kpi-card${newsVariant ? ` intel-kpi-card--${newsVariant}` : ''}`}
              aria-label={t.kpiNewsRiskAria.replace('{{value}}', newsExposure.maxRisk.toFixed(0))}
            >
              <div className="intel-kpi-card__label">{t.kpiNewsRiskLabel}</div>
              <div className="intel-kpi-card__value">{newsExposure.maxRisk.toFixed(0)}<span style={{ fontSize: '0.75em', fontWeight: 400, color: 'var(--text-tertiary)' }}>/100</span></div>
              <div className="intel-kpi-card__desc">{t.kpiNewsRiskDesc}</div>
            </article>
          );
        })()}

        {/* Group 3 — Exposure */}
        <div className="intel-kpi-group-label" aria-hidden="true">{t.kpiGroupExposure}</div>

        {/* Crypto Exposure */}
        <article
          className={`intel-kpi-card${diagnostics.cryptoExposure > 0.4 ? ' intel-kpi-card--warning' : ''}`}
          aria-label={t.kpiCryptoExpAria.replace('{{value}}', formatPct(diagnostics.cryptoExposure))}
        >
          <div className="intel-kpi-card__label">{t.kpiCryptoExpLabel}</div>
          <div className="intel-kpi-card__value">{formatPct(diagnostics.cryptoExposure)}</div>
          <div className="intel-kpi-card__desc">
            {diagnostics.cryptoExposure > 0.4 ? t.kpiCryptoExpDescAbove : t.kpiCryptoExpDescWithin}
          </div>
        </article>

        {/* Cash Target */}
        <article
          className="intel-kpi-card"
          aria-label={t.kpiCashTargetAria.replace('{{value}}', formatPct(diagnostics.cashTargetWeight))}
        >
          <div className="intel-kpi-card__label">{t.kpiCashTargetLabel}</div>
          <div className="intel-kpi-card__value">{formatPct(diagnostics.cashTargetWeight)}</div>
          <div className="intel-kpi-card__desc">{t.kpiCashTargetDesc}</div>
        </article>

      </section>

      {/*  3. Regime Awareness  */}
      <Section className="dashboard-section dashboard-section--tinted">
        <RegimePanel regime={regime} messages={t} />
        <MacroOverlayPanel
          macroScore={macro.overallMacroScore}
          confidence={macro.confidence}
          explanation={macro.explanations[0] ?? t.macroExplanationFallback}
          messages={t}
        />
      </Section>

      {/*  Diagnostics chart strip  */}
      <Section className="dashboard-section">
        <Card className="analytics-card">
          <div className="analytics-card__header">
            <div>
              <div className="section__eyebrow">{t.diagnosticsEyebrow}</div>
              <h3>{t.diagnosticsTitle}</h3>
            </div>
          </div>
          <div className="analytics-card__body">
            <DiagnosticsSummary diagnostics={diagnostics} messages={t} />
            {diagnostics.dominantRiskFactors[0] !== 'none' && (
              <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--color-muted-foreground)' }}>
                {t.dominantRiskFactors.replace('{{factors}}', diagnostics.dominantRiskFactors.join('  '))}
              </p>
            )}
          </div>
        </Card>
      </Section>

      {/*  Risk alerts  */}
      {riskAlerts.length > 0 && (
        <Section className="dashboard-section">
          <Card className="analytics-card">
            <div className="analytics-card__header">
              <div>
                <div className="section__eyebrow">{t.riskAlertsEyebrow}</div>
                <h3>{t.riskAlertsTitle}</h3>
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
                    {alert.message}  <span className="text-muted">{alert.detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        </Section>
      )}

      {/*  4-9. Analytical deep-dives, grouped behind tabs (one view at a time)  */}
      <Section className="dashboard-section">
        <IntelligenceAnalysisTabs
          tabs={[
            {
              id: 'ranking',
              label: t.tabRanking,
              panel: (
                <Card className="analytics-card">
                  <div className="analytics-card__header">
                    <div>
                      <div className="section__eyebrow">{t.rankingEyebrow}</div>
                      <h3>{t.rankingTitle}</h3>
                      <p>{t.rankingDescription}</p>
                    </div>
                  </div>
                  <div className="analytics-card__body">
                    <RankingTable ranking={ranking} messages={t} />
                  </div>
                </Card>
              ),
            },
            {
              id: 'allocation',
              label: t.tabAllocation,
              panel: (
                <Card className="analytics-card">
                  <div className="analytics-card__header">
                    <div>
                      <div className="section__eyebrow">{t.allocationEyebrow}</div>
                      <h3>{t.allocationTitle}</h3>
                      <p>{portfolioSummary.explanation}</p>
                    </div>
                  </div>
                  <div className="analytics-card__body">
                    <AllocationMatrix allocations={allocations} messages={t} />
                  </div>
                </Card>
              ),
            },
            {
              id: 'factors',
              label: t.tabFactors,
              panel: (
                <Card className="analytics-card">
                  <div className="analytics-card__header">
                    <div>
                      <div className="section__eyebrow">{t.factorsEyebrow}</div>
                      <h3>{t.factorsTitle}</h3>
                      <p>{t.factorsDescription}</p>
                    </div>
                  </div>
                  <div className="analytics-card__body">
                    <FactorDecompositionPanel allocations={allocations} messages={t} />
                  </div>
                </Card>
              ),
            },
            {
              id: 'risk',
              label: t.tabRiskOverlay,
              panel: (
                <Card className="analytics-card">
                  <div className="analytics-card__header">
                    <div>
                      <div className="section__eyebrow">{t.riskOverlayEyebrow}</div>
                      <h3>{t.riskOverlayTitle}</h3>
                      <p>{t.riskOverlayDescription}</p>
                    </div>
                  </div>
                  <div className="analytics-card__body">
                    <RiskOverlayPanel allocations={allocations} messages={t} />
                  </div>
                </Card>
              ),
            },
            {
              id: 'rebalance',
              label: t.tabRebalance,
              hint: rebalancePlan.length > 0 ? String(rebalancePlan.length) : undefined,
              panel: (
                <Card className="analytics-card">
                  <div className="analytics-card__header">
                    <div>
                      <div className="section__eyebrow">{t.rebalanceEyebrow}</div>
                      <h3>{t.rebalanceTitle}</h3>
                      <p>
                        {rebalancePlan.length > 0
                          ? t.rebalanceDescriptionRequired
                              .replace('{{count}}', String(rebalancePlan.length))
                              .replace('{{plural}}', rebalancePlan.length !== 1 ? 's' : '')
                          : t.rebalanceDescriptionNone}
                      </p>
                    </div>
                  </div>
                  {rebalancePlan.length > 0 && (
                    <div className="analytics-card__body">
                      <table className="data-table" style={{ width: '100%' }}>
                        <thead>
                          <tr>
                            <th scope="col" style={{ textAlign: 'left' }}>{t.colSymbol}</th>
                            <th scope="col" style={{ textAlign: 'left' }}>{t.colSide}</th>
                            <th scope="col" style={{ textAlign: 'right' }}>{t.colWeightDelta}</th>
                            <th scope="col" style={{ textAlign: 'right' }}>{t.colNotionalPct}</th>
                            <th scope="col" style={{ textAlign: 'left' }}>{t.colReasoning}</th>
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
                                {trade.reasoning.slice(0, 120)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card>
              ),
            },
            {
              id: 'broker',
              label: t.tabBrokerPreview,
              panel: <BrokerPreviewCard brokerReadiness={brokerReadiness} brokerPreviews={brokerPreviews} messages={t} />,
            },
          ]}
        />
      </Section>

      {/*  10. Explanation / Audit Trail (collapsed by default)  */}
      <Section className="dashboard-section dashboard-section--tinted">
        <Disclosure summary={t.disclosureSummary} hint={t.disclosureHint}>
          <ExplanationCard explanation={intelligence.explanation} messages={t} />
        </Disclosure>
      </Section>

      {/*  Simulation CTA  */}
      <Section className="dashboard-section">
        <ExecutePlanActions messages={t} />
      </Section>
    </>
  );
}
