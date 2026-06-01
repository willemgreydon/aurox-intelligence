import type { BrokerDecision } from '@repo/agents';
import type {
  ClaudeFinanceActivityMode,
  ClaudeFinanceQuoteSnapshot,
  ClaudeFinanceRecentDecision,
  SimulatedBrokerActivity,
} from '@repo/api-contracts';

/**
 * Pure transformation layer for the Claude Finance cockpit.
 *
 * Mappers here are synchronous, side-effect free, and deterministic. They turn
 * domain outputs (BrokerDecision, raw decision rows) into display-ready view
 * models. No I/O, no provider calls, no DB access — that lives in the service
 * layer. See .claude/rules/mapper-normalization-rule.md.
 */

function formatUsd(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '—';
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercentLabel(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '—';
  }
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function formatConfidence(value: number): string {
  const clamped = Math.max(0, Math.min(1, value));
  return `${Math.round(clamped * 100)}%`;
}

/**
 * Derive a coarse risk level for display from the broker decision.
 * Higher execution readiness ⇒ lower risk. Blocking reasons or risk flags
 * escalate. This is presentation-only; the authoritative risk gating already
 * happened inside evaluateBrokerDecision.
 */
export function deriveActivityRiskLevel(decision: BrokerDecision): 'low' | 'medium' | 'high' {
  if (!decision.executable || decision.riskFlags.length >= 2 || decision.executionReadinessScore < 50) {
    return 'high';
  }
  if (decision.warningReasons.length > 0 || decision.executionReadinessScore < 80) {
    return 'medium';
  }
  return 'low';
}

/**
 * Map the side + executability of a deterministic broker decision into the
 * cockpit's action vocabulary (buy/sell/hold/watch).
 *
 * - executable buy/sell  → buy/sell (a concrete simulated action is proposed)
 * - blocked buy          → watch  (do not act yet; keep observing)
 * - blocked sell         → hold   (do not reduce yet)
 */
export function deriveActivityAction(
  side: 'buy' | 'sell',
  executable: boolean,
): 'buy' | 'sell' | 'hold' | 'watch' {
  if (executable) {
    return side;
  }
  return side === 'buy' ? 'watch' : 'hold';
}

export type MapActivityContext = {
  id: string;
  mode: ClaudeFinanceActivityMode;
  symbol: string;
  assetId: string;
  assetClass: 'stock' | 'etf' | 'crypto';
  side: 'buy' | 'sell';
  quantity: number;
  quote: ClaudeFinanceQuoteSnapshot;
  createdAt: string;
};

/**
 * Map a BrokerDecision into a SimulatedBrokerActivity preview.
 *
 * The result is a PREVIEW only — it never authorizes execution. simulationOnly
 * and liveAllowed are inherited verbatim from the decision engine, which always
 * returns `true`/`false` respectively.
 */
export function mapBrokerDecisionToActivity(
  decision: BrokerDecision,
  ctx: MapActivityContext,
): SimulatedBrokerActivity {
  const action = deriveActivityAction(ctx.side, decision.executable);
  const riskLevel = deriveActivityRiskLevel(decision);

  const hasPrice = ctx.quote.price !== null && Number.isFinite(ctx.quote.price);
  const simulatedNotional = hasPrice ? (ctx.quote.price as number) * ctx.quantity : null;

  // Buy/sell proposals must always surface a risk caveat (financial UI safety).
  const warnings = [...decision.riskWarnings];
  if ((action === 'buy' || action === 'sell') && warnings.length === 0) {
    warnings.push('Simulated activity only — review risk before any real-world decision. Not financial advice.');
  }

  return {
    id: ctx.id,
    mode: ctx.mode,
    symbol: ctx.symbol,
    assetId: ctx.assetId,
    assetClass: ctx.assetClass,
    action,
    simulatedQuantity: ctx.quantity,
    simulatedNotional,
    simulatedNotionalLabel: formatUsd(simulatedNotional),
    confidence: Math.max(0, Math.min(1, decision.executionReadinessScore / 100)),
    confidenceLabel: formatConfidence(decision.executionReadinessScore / 100),
    riskLevel,
    executable: decision.executable,
    quoteSnapshot: ctx.quote,
    estimatedFillLabel: hasPrice ? formatUsd(decision.estimatedFillPrice) : '—',
    estimatedFeesLabel: hasPrice ? formatUsd(decision.estimatedFees) : '—',
    nextBestAction: decision.nextBestAction,
    decisionSummary: decision.decisionSummary,
    explanation: decision.explanation,
    warnings,
    blockingReasons: decision.blockingReasons,
    createdAt: ctx.createdAt,
    simulationOnly: true,
    liveAllowed: false,
  };
}

/** Map a raw saved-decision row into a compact recent-decision card. */
export function mapRecentDecision(row: {
  id: string;
  symbol: string | null;
  action: string;
  confidence: number | null;
  proposedNotional: number | null;
  decisionJson: Record<string, unknown> | null;
  createdAt: string;
}): ClaudeFinanceRecentDecision {
  const summaryFromJson =
    row.decisionJson && typeof row.decisionJson.decisionSummary === 'string'
      ? row.decisionJson.decisionSummary
      : row.decisionJson && typeof row.decisionJson.summary === 'string'
        ? (row.decisionJson.summary as string)
        : 'Simulated decision preview.';

  return {
    id: row.id,
    symbol: row.symbol,
    action: row.action,
    confidenceLabel: row.confidence !== null ? formatConfidence(row.confidence) : '—',
    notionalLabel: formatUsd(row.proposedNotional),
    summary: summaryFromJson,
    createdAt: row.createdAt,
  };
}

export const financeMapperFormat = {
  formatUsd,
  formatPercentLabel,
  formatConfidence,
};
