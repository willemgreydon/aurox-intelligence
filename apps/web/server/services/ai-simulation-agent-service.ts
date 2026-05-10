import type {
  AiSimulationAgentRequest,
  AiSimulationAgentResult,
  AiSimulationProposedOrder,
} from '@repo/api-contracts';
import { runAiSimulationAgent } from '@repo/agents';
import {
  getPreferredSimulationSessionForUser,
  getSimulationWorkspaceIfExists,
  getLatestMarketQuoteSnapshot,
  getTodayAiSimulationOrderNotionalForUser,
  getUserWatchlist,
  insertSimulationAgentDecision,
  linkSimulationAgentDecisionToOrder,
} from '@repo/db';
import { createHash } from 'node:crypto';
import { hasOpenAiApiKey, resolveAiAgentProviderConfig } from '../env/ai-agent-env';
import { callOpenAiSimulationAgent } from '../lib/ai/openai-client';
import { executeTradeForUser } from './trade-execution-service';
import { getBrokerModeConfig } from '../config/broker-mode-registry';
import { getInvestReadModel } from '../queries/invest-query';
import { mapInvestOverview } from '../mappers/invest-mapper';
import {
  evaluateAiDailyNotionalCap,
  mapRankedAssetsForAgent,
  type AiDailyNotionalCapDecision,
} from './ai-simulation-agent-guardrails';
import { getLatestNewsSignalForAsset, getSnapshotsForAsset } from './news-intelligence-service';

export type AiSimulationAgentServiceInput = {
  userId: string;
  autonomyMode: 'suggest_only' | 'human_confirmed' | 'autonomous_simulation';
  maxNotionalPerTrade: number;
  maxDailyNotional: number;
  maxOpenExposure: number;
  modeId: string;
};

export type AiSimulationAgentAvailability =
  | { available: false; reason: string; warning?: string }
  | { available: true; warning?: string };

const AI_SIMULATION_STRATEGY_TAG = 'ai_simulation_agent_v1';
const AI_RANKED_QUOTE_SYMBOL_LIMIT = 40;
const AI_RANKED_HISTORY_SYMBOL_LIMIT = 40;

export function checkAiSimulationAgentAvailability(): AiSimulationAgentAvailability {
  const resolved = resolveAiAgentProviderConfig();
  if (!resolved.available) {
    return {
      available: false,
      reason: 'AI provider unavailable. The agent defaulted to HOLD for safety.',
    };
  }
  if (resolved.provider !== 'openai') {
    if (hasOpenAiApiKey()) {
      return {
        available: true,
        warning:
          'Primary AI provider is Anthropic, but the simulation agent currently executes with OpenAI fallback.',
      };
    }
    return {
      available: false,
      reason: 'AI provider unavailable. The agent defaulted to HOLD for safety.',
      warning: resolved.usingDeprecatedClaudeAlias
        ? 'Using deprecated CLAUDE_FINANCE_API_KEY alias. Prefer ANTHROPIC_API_KEY.'
        : undefined,
    };
  }
  return {
    available: true,
    warning: resolved.usingDeprecatedClaudeAlias
      ? 'Using deprecated CLAUDE_FINANCE_API_KEY alias. Prefer ANTHROPIC_API_KEY.'
      : undefined,
  };
}

function buildUnavailableResult(
  reason: string,
  input: AiSimulationAgentServiceInput,
  requestedAt: string,
): AiSimulationAgentResult {
  return {
    decision: {
      action: 'HOLD',
      symbol: null,
      assetClass: null,
      notional: null,
      confidence: 0,
      reasoning: reason,
      riskNotes: 'Agent unavailable.',
      simulationOnly: true,
      requiresHumanConfirmation: true,
      rejectedReason: reason,
      proposedOrder: null,
    },
    requestedAt,
    processedAt: new Date().toISOString(),
    agentVersion: 'v1',
    decisionAuditId: null,
    autonomyMode: input.autonomyMode,
    capSettings: {
      maxNotionalPerTrade: input.maxNotionalPerTrade,
      maxDailyNotional: input.maxDailyNotional,
      maxOpenExposure: input.maxOpenExposure,
    },
    tradeSubmitted: false,
    tradeError: null,
  };
}

function buildRankedSnapshotHash(rankedAssets: AiSimulationAgentRequest['rankedAssets']): string | null {
  if (rankedAssets.length === 0) {
    return null;
  }

  const payload = JSON.stringify(
    rankedAssets.map((asset) => ({
      symbol: asset.symbol,
      assetKind: asset.assetKind,
      recommendation: asset.recommendation,
      score: asset.score,
      confidence: asset.confidence,
      explanation: asset.explanation,
      riskSummary: asset.riskSummary,
      signalSummary: asset.signalSummary,
    })),
  );

  return createHash('sha256').update(payload).digest('hex');
}

async function enforceAiDailyNotionalCapForUser(input: {
  userId: string;
  proposedNotional: number;
  maxDailyNotional: number;
  laneId?: string | null;
}): Promise<AiDailyNotionalCapDecision> {
  try {
    const usedToday = await getTodayAiSimulationOrderNotionalForUser(
      input.userId,
      AI_SIMULATION_STRATEGY_TAG,
      input.laneId ?? null,
    );
    return evaluateAiDailyNotionalCap({
      usedToday,
      proposedNotional: input.proposedNotional,
      maxDailyNotional: input.maxDailyNotional,
    });
  } catch {
    return {
      allowed: false,
      reason:
        'Daily notional cap check failed because AI order usage could not be loaded safely.',
      usedToday: 0,
      remaining: 0,
    };
  }
}

async function loadRankedAssetsForAgentContext(
  userId: string,
  openPositionSymbols: string[],
): Promise<AiSimulationAgentRequest['rankedAssets']> {
  try {
    const watchlist = await getUserWatchlist(userId);
    const preferredSymbols = [
      ...new Set([...openPositionSymbols, ...watchlist.map((item) => item.symbol)]),
    ];
    const readModel = await getInvestReadModel({
      quoteSymbolLimit: AI_RANKED_QUOTE_SYMBOL_LIMIT,
      includeHistory: true,
      historySymbolLimit: AI_RANKED_HISTORY_SYMBOL_LIMIT,
      preferredSymbols,
      pageContext: 'ai-simulation-agent',
    });
    const overview = mapInvestOverview(readModel);
    return mapRankedAssetsForAgent(overview.rankedAssets);
  } catch {
    return [];
  }
}

export async function runAiSimulationAgentForUser(
  input: AiSimulationAgentServiceInput,
): Promise<AiSimulationAgentResult> {
  const requestedAt = new Date().toISOString();

  const availability = checkAiSimulationAgentAvailability();
  if (!availability.available) {
    return buildUnavailableResult(availability.reason, input, requestedAt);
  }

  const workspace = await getSimulationWorkspaceIfExists(input.userId);

  const openPositions: AiSimulationAgentRequest['openPositions'] = workspace?.positions
    .filter((p) => p.closedAt === null)
    .map((p) => ({
      symbol: p.symbol,
      assetClass: p.assetClass,
      quantity: p.quantity,
      averageCost: p.averageCost,
      marketValue: p.marketValue,
      unrealizedPnl: p.unrealizedPnl,
    })) ?? [];

  const rankedAssets = await loadRankedAssetsForAgentContext(
    input.userId,
    openPositions.map((position) => position.symbol),
  );

  let marketFreshnessNote = 'No market data available — agent will default to HOLD.';
  let newsContextNote = 'No news intelligence context available.';
  let newsSnapshotIds: string[] = [];
  const firstSymbol = openPositions[0]?.symbol;
  if (firstSymbol) {
    const snapshot = await getLatestMarketQuoteSnapshot(firstSymbol);
    if (snapshot) {
      marketFreshnessNote = `Last quote for ${firstSymbol}: $${snapshot.price} (observed ${snapshot.observedAt ?? snapshot.fetchedAt}).`;
    }
    const newsSignal = await getLatestNewsSignalForAsset(firstSymbol).catch(() => null);
    const newsRows = await getSnapshotsForAsset(firstSymbol).catch(() => []);
    newsSnapshotIds = newsRows.slice(0, 5).map((row) => row.id);
    if (newsSignal) {
      newsContextNote = `News sentiment ${newsSignal.avgSentiment.toFixed(2)}, max risk ${newsSignal.maxRisk.toFixed(0)}, urgency ${(newsSignal.maxUrgency * 100).toFixed(0)}%.`;
    }
  }

  const agentRequest: AiSimulationAgentRequest = {
    autonomyMode: input.autonomyMode,
    modeId: input.modeId,
    capSettings: {
      maxNotionalPerTrade: input.maxNotionalPerTrade,
      maxDailyNotional: input.maxDailyNotional,
      maxOpenExposure: input.maxOpenExposure,
    },
    portfolioSummary: {
      cashBalance: workspace?.summary.cashBalance ?? 0,
      equityValue: workspace?.summary.equityValue ?? 0,
      availableCash: workspace?.summary.availableCash ?? 0,
      openPositionCount: workspace?.summary.positionCount ?? 0,
      unrealizedPnl: workspace?.summary.unrealizedPnl ?? 0,
      realizedPnl: workspace?.summary.realizedPnl ?? 0,
    },
    openPositions,
    rankedAssets,
    marketFreshnessNote,
    generatedAt: requestedAt,
  };

  const agentResult = await runAiSimulationAgent(agentRequest, callOpenAiSimulationAgent);

  if (!agentResult.ok) {
    return buildUnavailableResult(agentResult.error, input, requestedAt);
  }

  const decision = agentResult.value;
  const session = await getPreferredSimulationSessionForUser(input.userId, null).catch(() => null);
  const decisionAudit = await insertSimulationAgentDecision({
    userId: input.userId,
    accountId: workspace?.summary.accountId ?? null,
    portfolioId: workspace?.summary.portfolioId ?? null,
    sessionId: session?.id ?? null,
    laneId: session?.laneId ?? null,
    mode: input.autonomyMode,
    action: decision.action,
    symbol: decision.symbol,
    assetClass: decision.assetClass,
    confidence: decision.confidence,
    proposedNotional: decision.proposedOrder?.notional ?? decision.notional ?? null,
    maxNotionalPerTrade: input.maxNotionalPerTrade,
    maxDailyNotional: input.maxDailyNotional,
    rankedSnapshotHash: buildRankedSnapshotHash(agentRequest.rankedAssets),
    decisionJson: {
      decision,
      capSettings: agentRequest.capSettings,
      generatedAt: agentRequest.generatedAt,
      marketFreshnessNote: `${agentRequest.marketFreshnessNote} ${newsContextNote}`,
      newsSnapshotIds,
      rankedAssetCount: agentRequest.rankedAssets.length,
    },
    rejectedReason: decision.rejectedReason,
  }).catch(() => null);

  const decisionAuditId = decisionAudit?.id ?? null;
  let tradeSubmitted = false;
  let tradeError: string | null = null;

  // Autonomous simulation: auto-submit if agent requests execution and autonomy allows it.
  if (
    input.autonomyMode === 'autonomous_simulation' &&
    (decision.action === 'SIMULATED_BUY_REQUEST' || decision.action === 'SIMULATED_SELL_REQUEST') &&
    decision.proposedOrder !== null &&
    !decision.requiresHumanConfirmation
  ) {
    const config = getBrokerModeConfig(decision.proposedOrder.modeId);

    if (config === null || config.executionTarget !== 'simulation') {
      tradeError = 'Autonomous execution rejected: invalid or non-simulation mode config.';
    } else {
      const dailyCapCheck = await enforceAiDailyNotionalCapForUser({
        userId: input.userId,
        proposedNotional: decision.proposedOrder.notional,
        maxDailyNotional: input.maxDailyNotional,
        laneId: session?.laneId ?? null,
      });

      if (!dailyCapCheck.allowed) {
        tradeError = dailyCapCheck.reason;
      } else {
        const tradeResult = await executeTradeForUser(
          {
            accountId: input.userId,
            modeId: decision.proposedOrder.modeId,
            source: 'ai_autonomous',
            symbol: decision.proposedOrder.symbol,
            assetKind: decision.proposedOrder.assetClass,
            side: decision.proposedOrder.side,
            sizingMode: 'notional',
            notional: decision.proposedOrder.notional,
            thesis: decision.reasoning,
            confidence: decision.confidence,
            strategyTag: AI_SIMULATION_STRATEGY_TAG,
          },
          config,
          input.userId,
        );

        if (tradeResult.ok) {
          tradeSubmitted = true;
          if (decisionAuditId) {
            await linkSimulationAgentDecisionToOrder({
              decisionId: decisionAuditId,
              simulationOrderId: tradeResult.value.order.orderId,
              userId: input.userId,
              linkType: 'autonomous_submission',
              accountId: workspace?.summary.accountId ?? null,
              portfolioId: workspace?.summary.portfolioId ?? null,
              sessionId: session?.id ?? null,
              laneId: session?.laneId ?? null,
              notional: decision.proposedOrder.notional,
            }).catch(() => undefined);
          }
        } else {
          tradeError = tradeResult.error;
        }
      }
    }
  }

  return {
    decision,
    requestedAt,
    processedAt: new Date().toISOString(),
    agentVersion: 'v1',
    decisionAuditId,
    autonomyMode: input.autonomyMode,
    capSettings: agentRequest.capSettings,
    tradeSubmitted,
    tradeError,
  };
}

export async function confirmAiSimulationTrade(
  userId: string,
  proposedOrder: AiSimulationProposedOrder,
  reasoning: string,
  confidence: number,
  maxDailyNotional?: number | null,
  decisionAuditId?: string | null,
): Promise<{ ok: boolean; error?: string }> {
  const session = await getPreferredSimulationSessionForUser(userId, null).catch(() => null);
  const config = getBrokerModeConfig(proposedOrder.modeId);

  if (config === null) {
    return { ok: false, error: 'Unknown broker mode.' };
  }

  if (config.executionTarget !== 'simulation') {
    return { ok: false, error: 'Confirmation rejected: execution target is not simulation.' };
  }

  if (typeof maxDailyNotional === 'number') {
    const dailyCapCheck = await enforceAiDailyNotionalCapForUser({
      userId,
      proposedNotional: proposedOrder.notional,
      maxDailyNotional,
      laneId: session?.laneId ?? null,
    });

    if (!dailyCapCheck.allowed) {
      return { ok: false, error: dailyCapCheck.reason };
    }
  }

  const result = await executeTradeForUser(
    {
      accountId: userId,
      modeId: proposedOrder.modeId,
      source: 'ai_suggested',
      symbol: proposedOrder.symbol,
      assetKind: proposedOrder.assetClass,
      side: proposedOrder.side,
      sizingMode: 'notional',
      notional: proposedOrder.notional,
      thesis: reasoning,
      confidence,
      strategyTag: AI_SIMULATION_STRATEGY_TAG,
    },
    config,
    userId,
  );

  if (result.ok) {
    if (decisionAuditId) {
      const workspace = await getSimulationWorkspaceIfExists(userId).catch(() => null);
      await linkSimulationAgentDecisionToOrder({
        decisionId: decisionAuditId,
        simulationOrderId: result.value.order.orderId,
        userId,
        linkType: 'human_confirmation',
        accountId: workspace?.summary.accountId ?? null,
        portfolioId: workspace?.summary.portfolioId ?? null,
        sessionId: session?.id ?? null,
        laneId: session?.laneId ?? null,
        notional: proposedOrder.notional,
      }).catch(() => undefined);
    }

    return { ok: true };
  }

  return { ok: false, error: result.error };
}
