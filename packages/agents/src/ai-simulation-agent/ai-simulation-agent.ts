import type {
  AiSimulationAgentRequest,
  AiSimulationAgentDecision,
} from '@repo/api-contracts';
import { aiSimulationAgentDecisionSchema } from '@repo/api-contracts';
import type { AgentResult } from '../types/agent-types';
import { agentOk } from '../types/agent-types';

export type AiDecisionCallerFn = (context: AiSimulationAgentRequest) => Promise<unknown>;

const MIN_CONFIDENCE_THRESHOLD = 0.5;

function buildHold(reason: string): AiSimulationAgentDecision {
  return {
    action: 'HOLD',
    symbol: null,
    assetClass: null,
    notional: null,
    confidence: 0,
    reasoning: reason,
    riskNotes: 'No risk assessment available — defaulted to HOLD.',
    simulationOnly: true,
    requiresHumanConfirmation: true,
    rejectedReason: reason,
    proposedOrder: null,
  };
}

function enforceSafetyRules(
  decision: AiSimulationAgentDecision,
  request: AiSimulationAgentRequest,
): AiSimulationAgentDecision {
  if (decision.simulationOnly !== true) {
    return buildHold('Decision rejected: simulationOnly was not true.');
  }

  if (decision.confidence < MIN_CONFIDENCE_THRESHOLD && decision.action !== 'HOLD') {
    return buildHold(
      `Confidence ${decision.confidence.toFixed(2)} is below threshold ${MIN_CONFIDENCE_THRESHOLD}. Defaulting to HOLD.`,
    );
  }

  if (request.autonomyMode === 'suggest_only') {
    if (decision.action === 'SIMULATED_BUY_REQUEST') {
      return {
        ...decision,
        action: 'PROPOSE_BUY',
        requiresHumanConfirmation: true,
        reasoning: `${decision.reasoning} (Downgraded to PROPOSE_BUY in suggest_only mode.)`,
      };
    }

    if (decision.action === 'SIMULATED_SELL_REQUEST') {
      return {
        ...decision,
        action: 'PROPOSE_SELL',
        requiresHumanConfirmation: true,
        reasoning: `${decision.reasoning} (Downgraded to PROPOSE_SELL in suggest_only mode.)`,
      };
    }
  }

  if (
    request.autonomyMode === 'human_confirmed' &&
    (decision.action === 'SIMULATED_BUY_REQUEST' || decision.action === 'SIMULATED_SELL_REQUEST')
  ) {
    return { ...decision, requiresHumanConfirmation: true };
  }

  if (
    decision.notional !== null &&
    decision.notional > request.capSettings.maxNotionalPerTrade
  ) {
    return buildHold(
      `Proposed notional $${decision.notional} exceeds maxNotionalPerTrade cap of $${request.capSettings.maxNotionalPerTrade}.`,
    );
  }

  return decision;
}

export async function runAiSimulationAgent(
  request: AiSimulationAgentRequest,
  caller: AiDecisionCallerFn,
): Promise<AgentResult<AiSimulationAgentDecision>> {
  let rawOutput: unknown;

  try {
    rawOutput = await caller(request);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown caller error';
    return agentOk(buildHold(`AI decision call failed: ${message}. Defaulting to HOLD.`));
  }

  const parsed = aiSimulationAgentDecisionSchema.safeParse(rawOutput);
  if (!parsed.success) {
    return agentOk(buildHold('AI output did not match expected schema. Defaulting to HOLD.'));
  }

  const safeDecision = enforceSafetyRules(parsed.data, request);
  return agentOk(safeDecision);
}
