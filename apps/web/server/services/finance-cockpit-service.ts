import { evaluateBrokerDecision, type BrokerDecision, type BrokerReadinessStatus } from '@repo/agents';
import {
  getRecentSimulationAgentDecisionsForUser,
  insertSimulationAgentDecision,
  type SimulationAgentDecisionSummaryRow,
} from '@repo/db';
import type {
  ClaudeFinanceActivityInput,
  ClaudeFinanceCockpitViewModel,
  ClaudeFinanceLaneCard,
  ClaudeFinanceQuoteSnapshot,
  SimulatedBrokerActivity,
} from '@repo/api-contracts';
import { requireCurrentSession } from '../auth/session';
import { formatFreshnessLabel } from '../lib/quote-display';
import { getRequestLocale } from '../i18n/locale';
import { loadQuoteSnapshots } from './stock-simulation-service';
import { getPortfolioIntelligenceViewModel } from './portfolio-intelligence-service';
import { getSimulationWorkstationStateForCurrentUser } from './simulation-workstation-service';
import { mapBrokerDecisionToActivity, mapRecentDecision, financeMapperFormat } from '../mappers/finance-mapper';

/**
 * Claude Finance cockpit service.
 *
 * Orchestrates existing, audited systems — portfolio intelligence, simulation
 * workstation state, the watchlist, the deterministic broker-decision engine,
 * and the decision audit table. It NEVER executes an order: the activity
 * preview calls only the pure `evaluateBrokerDecision`. Simulation-first,
 * preview-only, fully reversible.
 */

const SIMULATION_ONLY_NOTICE =
  'Simulated broker activity · preview only · paper trading. Live execution is permanently locked. Not financial advice.';

function microTradingEnabled(): boolean {
  return String(process.env.FEATURE_SIM_MICRO_TRADING ?? 'false').toLowerCase() === 'true';
}

function changeStance(changePercent: number | null): 'positive' | 'negative' | 'neutral' {
  if (changePercent === null || !Number.isFinite(changePercent)) return 'neutral';
  if (changePercent > 0.05) return 'positive';
  if (changePercent < -0.05) return 'negative';
  return 'neutral';
}

/** Build a BrokerReadinessStatus from the portfolio-intelligence broker readiness view. */
function toReadinessStatus(readiness: { ready: boolean; summary: string }): BrokerReadinessStatus {
  return {
    ready: readiness.ready,
    summary: readiness.summary,
    checks: [{ name: 'portfolio_intelligence_readiness', passed: readiness.ready, detail: readiness.summary }],
  };
}

export async function getClaudeFinanceCockpitData(): Promise<ClaudeFinanceCockpitViewModel> {
  const auth = await requireCurrentSession('/finance');
  const locale = await getRequestLocale();

  const [intelligenceResult, workstation, recentRows] = await Promise.all([
    getPortfolioIntelligenceViewModel().catch(() => null),
    getSimulationWorkstationStateForCurrentUser({ assetLimit: 48, watchlistLimit: 24 }).catch(() => null),
    getRecentSimulationAgentDecisionsForUser(auth.user.id, 8).catch((): SimulationAgentDecisionSummaryRow[] => []),
  ]);

  const degraded = !intelligenceResult || intelligenceResult.status === 'degraded' || !workstation;

  const ctx = intelligenceResult?.portfolioContext;
  const ownedSymbols = new Set(
    (workstation?.workspace?.positions ?? []).map((position) => position.symbol.toUpperCase()),
  );

  // Starred lanes = the user's existing DB-backed watchlist. We reuse the
  // workstation's watchlist projection (already joined with quotes).
  const starredLanes: ClaudeFinanceLaneCard[] = (workstation?.watchlist ?? []).map((entry) => {
    const quote = entry.quote;
    const price = quote?.price ?? null;
    const change = quote?.changePercent ?? null;
    return {
      assetId: entry.asset.assetId,
      symbol: entry.asset.symbol,
      name: entry.asset.name,
      assetClass: entry.asset.assetClass,
      category: entry.asset.category,
      thesis: entry.asset.thesis,
      riskSummary: entry.asset.riskSummary,
      actionAvailability: entry.asset.actionAvailability,
      priceLabel: financeMapperFormat.formatUsd(price),
      changeLabel: financeMapperFormat.formatPercentLabel(change),
      changeStance: changeStance(change),
      freshnessLabel: formatFreshnessLabel(quote?.observedAt ?? null, locale, 'Unavailable', entry.asset.assetClass),
      isWatched: true,
      isOwned: ownedSymbols.has(entry.asset.symbol.toUpperCase()),
      canGenerateActivity:
        entry.asset.actionAvailability === 'available' || entry.asset.actionAvailability === 'simulated',
    };
  });

  const intelligence = intelligenceResult?.intelligence;
  const ranking = intelligence?.ranking ?? [];
  const topOpportunities = ranking
    .filter((row) => row.recommendation.includes('BUY'))
    .slice(0, 3)
    .map((row) => ({ symbol: row.symbol, action: row.recommendation, reason: row.reasonShort }));
  const assetsToWatch = ranking
    .filter((row) => row.recommendation === 'HOLD' || row.recommendation === 'REDUCE' || row.recommendation === 'AVOID')
    .slice(0, 3)
    .map((row) => ({ symbol: row.symbol, action: row.recommendation, reason: row.reasonShort }));

  const status: ClaudeFinanceCockpitViewModel['status'] = !intelligenceResult
    ? 'empty'
    : degraded
      ? 'degraded'
      : 'nominal';

  return {
    status,
    statusReason:
      intelligenceResult?.statusReason ??
      'Portfolio intelligence is warming up. Start a simulation session to populate the cockpit.',
    simulationOnlyNotice: SIMULATION_ONLY_NOTICE,
    hero: {
      portfolioValueLabel: financeMapperFormat.formatUsd(ctx?.portfolioValue ?? 0),
      cashLabel: financeMapperFormat.formatUsd(ctx?.cashBalance ?? 0),
      investedLabel: financeMapperFormat.formatUsd(ctx?.investedValue ?? 0),
      openPositionsLabel: String(ctx?.openPositionCount ?? 0),
      freshnessLabel: workstation?.workstationStatus
        ? workstation.workstationStatus.toUpperCase()
        : 'IDLE',
      portfolioState: ctx?.stateReason ?? 'No active simulation portfolio yet.',
    },
    intelligence: {
      healthLabel: intelligence?.diagnostics.allocationHealth ?? 'insufficient-data',
      averageConfidenceLabel: financeMapperFormat.formatConfidence(intelligence?.diagnostics.averageConfidence ?? 0),
      averageRiskLabel:
        intelligence?.diagnostics.averageRiskScore !== undefined
          ? `${Math.round(intelligence.diagnostics.averageRiskScore)}/100`
          : '—',
      regimeLabel: intelligence?.regime.regime ? intelligence.regime.regime.toUpperCase() : 'UNKNOWN',
      topOpportunities,
      assetsToWatch,
      explanation:
        intelligence?.explanation ??
        'Intelligence will appear once enough simulation portfolio and market data are available.',
    },
    starredLanes,
    starredEmptyMessage:
      starredLanes.length === 0 ? 'Star assets to build your Claude Finance lane.' : null,
    recentDecisions: recentRows.map(mapRecentDecision),
    microTradingEnabled: microTradingEnabled(),
  };
}

/**
 * Generate a deterministic, simulation-only broker activity PREVIEW.
 * Loads exactly one fresh quote, runs the pure decision engine, and maps the
 * result. NEVER executes an order — no portfolio state is mutated here.
 */
export async function generateSimulatedBrokerActivityForCurrentUser(
  input: ClaudeFinanceActivityInput,
): Promise<SimulatedBrokerActivity> {
  await requireCurrentSession('/finance');
  const locale = await getRequestLocale();
  const normalizedSymbol = input.symbol.trim().toUpperCase();

  const [intelligenceResult, snapshots] = await Promise.all([
    getPortfolioIntelligenceViewModel().catch(() => null),
    loadQuoteSnapshots([normalizedSymbol]).catch(() => []),
  ]);

  const quote = snapshots.find((snapshot) => snapshot.symbol.toUpperCase() === normalizedSymbol) ?? null;
  const quoteSnapshot: ClaudeFinanceQuoteSnapshot = {
    price: quote?.price ?? null,
    changePercent: quote?.changePercent ?? null,
    source: quote?.source ?? null,
    observedAt: quote?.observedAt ?? null,
    freshnessLabel: formatFreshnessLabel(quote?.observedAt ?? null, locale, 'Unavailable', input.assetClass),
  };

  const ctx = intelligenceResult?.portfolioContext;
  const cashBalance = ctx?.cashBalance ?? 0;
  const portfolioValue = ctx?.portfolioValue ?? 0;
  const openPositionCount = ctx?.openPositionCount ?? 0;
  const readiness = toReadinessStatus(
    intelligenceResult?.brokerReadiness ?? { ready: false, summary: 'Broker readiness unavailable.' },
  );

  const baseCtx = {
    id: `cf-${normalizedSymbol}-${input.side}-${Math.round(input.quantity * 1e4)}`,
    mode: input.mode,
    symbol: normalizedSymbol,
    assetId: input.assetId,
    assetClass: input.assetClass,
    side: input.side,
    quantity: input.quantity,
    quote: quoteSnapshot,
    createdAt: new Date().toISOString(),
  };

  // No usable quote → do NOT fabricate a price. Return a blocked, zero-fill
  // decision so the UI shows a degraded "quote unavailable" state.
  if (quote === null || quote.price === null || !Number.isFinite(quote.price)) {
    const blocked: BrokerDecision = {
      executable: false,
      simulationOnly: true,
      liveAllowed: false,
      reason: 'Market quote is unavailable — simulated activity blocked.',
      estimatedFillPrice: 0,
      estimatedSlippage: 0,
      estimatedFees: 0,
      estimatedLatencyMs: 0,
      riskFlags: ['DEGRADED_DATA'],
      riskWarnings: ['No fresh market quote is available for this symbol. Activity preview is blocked.'],
      readinessState: readiness,
      explanation:
        'No fresh market quote is available for this symbol, so no simulated activity can be previewed. Try again once data refreshes. Live execution is permanently locked.',
      executionReadinessScore: 0,
      blockingReasons: ['Market quote unavailable.'],
      warningReasons: ['Provider returned no usable price.'],
      estimatedSpreadImpact: 0,
      liquidityAssessment: 'unknown',
      decisionSummary: `${normalizedSymbol}: quote unavailable — activity blocked.`,
      nextBestAction: 'wait',
    };
    return mapBrokerDecisionToActivity(blocked, baseCtx);
  }

  const signalConfidence =
    intelligenceResult?.intelligence.ranking.find((row) => row.symbol.toUpperCase() === normalizedSymbol)
      ?.confidence ?? 1;
  const newsRiskFlag = (() => {
    const affected = intelligenceResult?.newsExposure.affectedAssets ?? [];
    return affected.some((symbol) => symbol.toUpperCase() === normalizedSymbol) ? 'HIGH' : 'LOW';
  })();

  const decision = evaluateBrokerDecision({
    order: {
      symbol: normalizedSymbol,
      side: input.side,
      quantity: input.quantity,
      orderType: 'market',
    },
    marketPrice: Math.max(quote.price, 0.01),
    cashBalance,
    portfolioValue,
    openPositionCount,
    newsRiskFlag,
    liquidityScore: input.assetClass === 'crypto' ? 0.7 : 0.85,
    signalConfidence,
    providerDegraded: intelligenceResult?.status === 'degraded',
    readiness,
  });

  return mapBrokerDecisionToActivity(decision, baseCtx);
}

/**
 * Persist a generated activity preview to the decision audit table.
 * This writes an append-only audit row only — it does NOT create an order or
 * mutate portfolio state.
 */
export async function saveSimulatedBrokerActivityForCurrentUser(
  activity: SimulatedBrokerActivity,
): Promise<{ id: string }> {
  const auth = await requireCurrentSession('/finance');

  const action: 'HOLD' | 'PROPOSE_BUY' | 'PROPOSE_SELL' =
    activity.action === 'buy' ? 'PROPOSE_BUY' : activity.action === 'sell' ? 'PROPOSE_SELL' : 'HOLD';

  return insertSimulationAgentDecision({
    userId: auth.user.id,
    mode: 'suggest_only',
    action,
    symbol: activity.symbol,
    assetClass: activity.assetClass,
    confidence: activity.confidence,
    proposedNotional: activity.simulatedNotional,
    rejectedReason: activity.executable ? null : activity.blockingReasons[0] ?? 'blocked',
    decisionJson: {
      source: 'claude_finance',
      mode: activity.mode,
      decisionSummary: activity.decisionSummary,
      explanation: activity.explanation,
      riskLevel: activity.riskLevel,
      nextBestAction: activity.nextBestAction,
      warnings: activity.warnings,
      blockingReasons: activity.blockingReasons,
      quoteSnapshot: activity.quoteSnapshot,
      simulationOnly: true,
      liveAllowed: false,
    },
  });
}
