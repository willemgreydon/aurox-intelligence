import { describe, expect, it } from 'vitest';
import type { BrokerDecision } from '@repo/agents';
import {
  deriveActivityAction,
  deriveActivityRiskLevel,
  mapBrokerDecisionToActivity,
  mapRecentDecision,
  type MapActivityContext,
} from './finance-mapper';

function makeDecision(overrides: Partial<BrokerDecision> = {}): BrokerDecision {
  return {
    executable: true,
    simulationOnly: true,
    liveAllowed: false,
    reason: 'Order passes all simulation execution checks.',
    estimatedFillPrice: 100,
    estimatedSlippage: 0.1,
    estimatedFees: 0.05,
    estimatedLatencyMs: 50,
    riskFlags: [],
    riskWarnings: [],
    readinessState: { ready: true, checks: [], summary: 'ready' },
    explanation: 'Eligible for simulation execution. Live execution is permanently locked.',
    executionReadinessScore: 100,
    blockingReasons: [],
    warningReasons: [],
    estimatedSpreadImpact: 0.05,
    liquidityAssessment: 'good',
    decisionSummary: 'AAPL BUY 5 — eligible for simulation.',
    nextBestAction: 'simulate',
    ...overrides,
  };
}

const baseCtx: MapActivityContext = {
  id: 'activity-1',
  mode: 'watchlist-analysis',
  symbol: 'AAPL',
  assetId: 'asset-aapl',
  assetClass: 'stock',
  side: 'buy',
  quantity: 5,
  quote: {
    price: 100,
    changePercent: 1.2,
    source: 'polygon',
    observedAt: '2026-06-01T12:00:00.000Z',
    freshnessLabel: 'Live',
  },
  createdAt: '2026-06-01T12:00:05.000Z',
};

describe('deriveActivityAction', () => {
  it('returns concrete side for executable decisions', () => {
    expect(deriveActivityAction('buy', true)).toBe('buy');
    expect(deriveActivityAction('sell', true)).toBe('sell');
  });

  it('downgrades a blocked buy to watch and a blocked sell to hold', () => {
    expect(deriveActivityAction('buy', false)).toBe('watch');
    expect(deriveActivityAction('sell', false)).toBe('hold');
  });
});

describe('deriveActivityRiskLevel', () => {
  it('is low for a clean executable decision', () => {
    expect(deriveActivityRiskLevel(makeDecision())).toBe('low');
  });

  it('is medium when warnings exist', () => {
    expect(
      deriveActivityRiskLevel(makeDecision({ warningReasons: ['Thin liquidity'], executionReadinessScore: 75 })),
    ).toBe('medium');
  });

  it('is high when blocked or multiple risk flags present', () => {
    expect(
      deriveActivityRiskLevel(
        makeDecision({ executable: false, executionReadinessScore: 25, blockingReasons: ['Insufficient cash'] }),
      ),
    ).toBe('high');
    expect(
      deriveActivityRiskLevel(makeDecision({ riskFlags: ['LOW_LIQUIDITY', 'HIGH_NEWS_RISK'] })),
    ).toBe('high');
  });
});

describe('mapBrokerDecisionToActivity', () => {
  it('maps an executable buy into a buy activity with notional and simulation invariants', () => {
    const activity = mapBrokerDecisionToActivity(makeDecision(), baseCtx);
    expect(activity.action).toBe('buy');
    expect(activity.simulatedNotional).toBe(500);
    expect(activity.simulatedNotionalLabel).toBe('$500.00');
    expect(activity.executable).toBe(true);
    expect(activity.simulationOnly).toBe(true);
    expect(activity.liveAllowed).toBe(false);
    expect(activity.confidence).toBe(1);
    expect(activity.confidenceLabel).toBe('100%');
  });

  it('always attaches a risk caveat to a buy/sell with no engine warnings', () => {
    const activity = mapBrokerDecisionToActivity(makeDecision({ riskWarnings: [] }), baseCtx);
    expect(activity.warnings.length).toBeGreaterThan(0);
    expect(activity.warnings.some((w) => w.toLowerCase().includes('not financial advice'))).toBe(true);
  });

  it('downgrades a blocked buy to a watch activity and surfaces blocking reasons', () => {
    const activity = mapBrokerDecisionToActivity(
      makeDecision({
        executable: false,
        executionReadinessScore: 25,
        blockingReasons: ['Estimated notional exceeds cash.'],
        riskFlags: ['INSUFFICIENT_CASH'],
      }),
      baseCtx,
    );
    expect(activity.action).toBe('watch');
    expect(activity.executable).toBe(false);
    expect(activity.riskLevel).toBe('high');
    expect(activity.blockingReasons).toContain('Estimated notional exceeds cash.');
  });

  it('renders dashes (never a fake price) when the quote price is unavailable', () => {
    const activity = mapBrokerDecisionToActivity(makeDecision(), {
      ...baseCtx,
      quote: { ...baseCtx.quote, price: null, freshnessLabel: 'Unavailable' },
    });
    expect(activity.simulatedNotional).toBeNull();
    expect(activity.simulatedNotionalLabel).toBe('—');
    expect(activity.estimatedFillLabel).toBe('—');
    expect(activity.estimatedFeesLabel).toBe('—');
  });
});

describe('mapRecentDecision', () => {
  it('formats a saved decision row into a compact card', () => {
    const card = mapRecentDecision({
      id: 'dec-1',
      symbol: 'BTC-USD',
      action: 'PROPOSE_BUY',
      confidence: 0.82,
      proposedNotional: 1234.5,
      decisionJson: { decisionSummary: 'BTC-USD eligible for simulation.' },
      createdAt: '2026-06-01T10:00:00.000Z',
    });
    expect(card.symbol).toBe('BTC-USD');
    expect(card.confidenceLabel).toBe('82%');
    expect(card.notionalLabel).toBe('$1,234.50');
    expect(card.summary).toBe('BTC-USD eligible for simulation.');
  });

  it('falls back to a default summary when none is present', () => {
    const card = mapRecentDecision({
      id: 'dec-2',
      symbol: null,
      action: 'HOLD',
      confidence: null,
      proposedNotional: null,
      decisionJson: null,
      createdAt: '2026-06-01T10:00:00.000Z',
    });
    expect(card.confidenceLabel).toBe('—');
    expect(card.notionalLabel).toBe('—');
    expect(card.summary).toBe('Simulated decision preview.');
  });
});
