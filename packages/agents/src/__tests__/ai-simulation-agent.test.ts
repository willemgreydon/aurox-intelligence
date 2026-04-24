import { describe, it, expect } from 'vitest';
import { runAiSimulationAgent } from '../ai-simulation-agent/ai-simulation-agent';
import type { AiSimulationAgentRequest, AiSimulationAgentDecision } from '@repo/api-contracts';

const baseRequest: AiSimulationAgentRequest = {
  autonomyMode: 'suggest_only',
  modeId: 'assisted_confirmation',
  capSettings: {
    maxNotionalPerTrade: 1000,
    maxDailyNotional: 5000,
    maxOpenExposure: 10000,
  },
  portfolioSummary: {
    cashBalance: 50000,
    equityValue: 50000,
    availableCash: 50000,
    openPositionCount: 0,
    unrealizedPnl: 0,
    realizedPnl: 0,
  },
  openPositions: [],
  rankedAssets: [
    {
      symbol: 'AAPL',
      assetKind: 'stock',
      score: 0.7,
      confidence: 0.8,
      recommendation: 'buy',
      signalSummary: 'Strong upward momentum.',
      riskSummary: 'Moderate risk.',
    },
  ],
  marketFreshnessNote: 'Fresh data.',
  generatedAt: new Date().toISOString(),
};

const validProposeBuy: AiSimulationAgentDecision = {
  action: 'PROPOSE_BUY',
  symbol: 'AAPL',
  assetClass: 'stock',
  notional: 500,
  confidence: 0.75,
  reasoning: 'Strong momentum signal favors upside.',
  riskNotes: 'Moderate risk. Within cap.',
  simulationOnly: true,
  requiresHumanConfirmation: true,
  rejectedReason: null,
  proposedOrder: {
    symbol: 'AAPL',
    assetClass: 'stock',
    side: 'buy',
    notional: 500,
    modeId: 'assisted_confirmation',
  },
};

describe('runAiSimulationAgent', () => {
  it('returns valid PROPOSE_BUY when caller returns valid output', async () => {
    const result = await runAiSimulationAgent(baseRequest, async () => validProposeBuy);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.action).toBe('PROPOSE_BUY');
      expect(result.value.simulationOnly).toBe(true);
      expect(result.value.requiresHumanConfirmation).toBe(true);
    }
  });

  it('returns HOLD when caller throws', async () => {
    const result = await runAiSimulationAgent(baseRequest, async () => {
      throw new Error('Network error');
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.action).toBe('HOLD');
    }
  });

  it('returns HOLD when output does not match schema', async () => {
    const result = await runAiSimulationAgent(baseRequest, async () => ({ invalid: true }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.action).toBe('HOLD');
    }
  });

  it('returns HOLD when output is null', async () => {
    const result = await runAiSimulationAgent(baseRequest, async () => null);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.action).toBe('HOLD');
    }
  });

  it('returns HOLD when confidence is below threshold', async () => {
    const lowConfidence = { ...validProposeBuy, confidence: 0.3 };
    const result = await runAiSimulationAgent(baseRequest, async () => lowConfidence);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.action).toBe('HOLD');
    }
  });

  it('downgrades SIMULATED_BUY_REQUEST to PROPOSE_BUY in suggest_only mode', async () => {
    const autoDecision = { ...validProposeBuy, action: 'SIMULATED_BUY_REQUEST' as const };
    const result = await runAiSimulationAgent(baseRequest, async () => autoDecision);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.action).toBe('PROPOSE_BUY');
      expect(result.value.requiresHumanConfirmation).toBe(true);
    }
  });

  it('downgrades SIMULATED_SELL_REQUEST to PROPOSE_SELL in suggest_only mode', async () => {
    const autoDecision = { ...validProposeBuy, action: 'SIMULATED_SELL_REQUEST' as const };
    const result = await runAiSimulationAgent(baseRequest, async () => autoDecision);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.action).toBe('PROPOSE_SELL');
      expect(result.value.requiresHumanConfirmation).toBe(true);
    }
  });

  it('returns HOLD when notional exceeds cap', async () => {
    const oversized = { ...validProposeBuy, notional: 99999 };
    const result = await runAiSimulationAgent(baseRequest, async () => oversized);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.action).toBe('HOLD');
    }
  });

  it('forces requiresHumanConfirmation for execution actions in human_confirmed mode', async () => {
    const request = { ...baseRequest, autonomyMode: 'human_confirmed' as const };
    const noConfirmDecision = {
      ...validProposeBuy,
      action: 'SIMULATED_BUY_REQUEST' as const,
      requiresHumanConfirmation: false,
    };
    const result = await runAiSimulationAgent(request, async () => noConfirmDecision);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.requiresHumanConfirmation).toBe(true);
    }
  });

  it('rejects when simulationOnly is not true (schema parse fails → HOLD)', async () => {
    const unsafe = { ...validProposeBuy, simulationOnly: false };
    const result = await runAiSimulationAgent(baseRequest, async () => unsafe);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.action).toBe('HOLD');
      expect(result.value.simulationOnly).toBe(true);
    }
  });

  it('allows HOLD action through all guards regardless of confidence', async () => {
    const holdDecision: AiSimulationAgentDecision = {
      action: 'HOLD',
      symbol: null,
      assetClass: null,
      notional: null,
      confidence: 0.1,
      reasoning: 'Uncertain conditions.',
      riskNotes: 'Low visibility.',
      simulationOnly: true,
      requiresHumanConfirmation: true,
      rejectedReason: null,
      proposedOrder: null,
    };
    const result = await runAiSimulationAgent(baseRequest, async () => holdDecision);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.action).toBe('HOLD');
    }
  });

  it('allows autonomous execution in autonomous_simulation mode within cap', async () => {
    const request = { ...baseRequest, autonomyMode: 'autonomous_simulation' as const };
    const autoDecision = {
      ...validProposeBuy,
      action: 'SIMULATED_BUY_REQUEST' as const,
      requiresHumanConfirmation: false,
      notional: 500,
    };
    const result = await runAiSimulationAgent(request, async () => autoDecision);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.action).toBe('SIMULATED_BUY_REQUEST');
      expect(result.value.requiresHumanConfirmation).toBe(false);
    }
  });
});
