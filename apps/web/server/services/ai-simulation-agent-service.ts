import type {
  AiSimulationAgentRequest,
  AiSimulationAgentResult,
  AiSimulationProposedOrder,
} from '@repo/api-contracts';
import { runAiSimulationAgent } from '@repo/agents';
import {
  getSimulationWorkspaceIfExists,
  getLatestMarketQuoteSnapshot,
} from '@repo/db';
import { hasOpenAiApiKey } from '../env/ai-agent-env';
import { callOpenAiSimulationAgent } from '../lib/ai/openai-client';
import { executeTradeForUser } from './trade-execution-service';
import { getBrokerModeConfig } from '../config/broker-mode-registry';

export type AiSimulationAgentServiceInput = {
  userId: string;
  autonomyMode: 'suggest_only' | 'human_confirmed' | 'autonomous_simulation';
  maxNotionalPerTrade: number;
  maxDailyNotional: number;
  maxOpenExposure: number;
  modeId: string;
};

export type AiSimulationAgentAvailability =
  | { available: false; reason: string }
  | { available: true };

export function checkAiSimulationAgentAvailability(): AiSimulationAgentAvailability {
  if (!hasOpenAiApiKey()) {
    return {
      available: false,
      reason:
        'AI simulation agent unavailable — missing server configuration (OPENAI_API_KEY).',
    };
  }

  return { available: true };
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

  // Ranked assets: in v1, not yet wired to @repo/ai-market-intelligence.
  // Future slice will inject real ranked assets here.
  const rankedAssets: AiSimulationAgentRequest['rankedAssets'] = [];

  let marketFreshnessNote = 'No market data available — agent will default to HOLD.';
  const firstSymbol = openPositions[0]?.symbol;
  if (firstSymbol) {
    const snapshot = await getLatestMarketQuoteSnapshot(firstSymbol);
    if (snapshot) {
      marketFreshnessNote = `Last quote for ${firstSymbol}: $${snapshot.price} (observed ${snapshot.observedAt ?? snapshot.fetchedAt}).`;
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
          strategyTag: 'ai_simulation_agent_v1',
        },
        config,
        input.userId,
      );

      if (tradeResult.ok) {
        tradeSubmitted = true;
      } else {
        tradeError = tradeResult.error;
      }
    }
  }

  return {
    decision,
    requestedAt,
    processedAt: new Date().toISOString(),
    agentVersion: 'v1',
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
): Promise<{ ok: boolean; error?: string }> {
  const config = getBrokerModeConfig(proposedOrder.modeId);

  if (config === null) {
    return { ok: false, error: 'Unknown broker mode.' };
  }

  if (config.executionTarget !== 'simulation') {
    return { ok: false, error: 'Confirmation rejected: execution target is not simulation.' };
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
      strategyTag: 'ai_simulation_agent_v1',
    },
    config,
    userId,
  );

  if (result.ok) {
    return { ok: true };
  }

  return { ok: false, error: result.error };
}
