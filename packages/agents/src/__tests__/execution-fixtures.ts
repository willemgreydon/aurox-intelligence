// Deterministic fixtures for trade-execution workflow/supervisor tests.
// Fixed timestamps and ids — no Math.random(), no Date.now() in the fixtures
// themselves (test-data-rule.md). Builders take overrides so each test can
// craft exactly the account / mode / intent state it needs.
import type {
  SimulationAccountSummary,
  SimulationOrder,
  SimulationPosition,
  SimulationWorkspace,
} from '@repo/api-contracts';
import type { AgentContext, TraceId } from '../types/agent-types';
import type { BrokerModeConfig, TradeIntentPayload } from '../types/broker-types';
import type { IntelligenceDecisionBundle } from '../types/execution-types';
import type {
  BrokerExecutionAdapter,
  ExecutionOrderResult,
} from '../adapters/broker-execution-adapter';
import { agentOk } from '../types/agent-types';

export const FIXED_TS = '2026-01-01T00:00:00.000Z';
export const TRACE_ID = 'trace-test' as TraceId;

export function makeContext(overrides: Partial<AgentContext> = {}): AgentContext {
  return {
    traceId: TRACE_ID,
    accountId: 'acc-1',
    userId: 'user-1',
    modeId: 'manual_only',
    initiatedAt: FIXED_TS,
    ...overrides,
  };
}

export function makeSummary(overrides: Partial<SimulationAccountSummary> = {}): SimulationAccountSummary {
  return {
    accountId: 'acc-1',
    portfolioId: 'port-1',
    currency: 'USD',
    quoteCurrency: 'USD',
    fxConversionAvailable: false,
    fxConversionNote: 'No FX conversion available.',
    initialCashBalance: 100_000,
    cashBalance: 50_000,
    reservedCash: 0,
    availableCash: 50_000,
    investedCapital: 0,
    portfolioValue: 0,
    equityValue: 100_000,
    unrealizedPnl: 0,
    realizedPnl: 0,
    buyingPower: 50_000,
    activeInvestmentCount: 0,
    closedInvestmentCount: 0,
    positionCount: 0,
    updatedAt: FIXED_TS,
    ...overrides,
  };
}

export function makeOrder(overrides: Partial<SimulationOrder> = {}): SimulationOrder {
  return {
    id: 'order-1',
    assetId: 'asset-aapl',
    symbol: 'AAPL',
    assetClass: 'stock',
    side: 'buy',
    status: 'filled',
    quantity: 10,
    requestedPrice: 150,
    executedPrice: 150,
    grossAmount: 1500,
    cashEffect: -1500,
    realizedPnl: 0,
    notes: null,
    createdAt: FIXED_TS,
    executedAt: FIXED_TS,
    ...overrides,
  };
}

export function makePosition(overrides: Partial<SimulationPosition> = {}): SimulationPosition {
  return {
    id: 'pos-1',
    assetId: 'asset-aapl',
    symbol: 'AAPL',
    assetClass: 'stock',
    quantity: 10,
    averageCost: 100,
    marketPrice: 110,
    marketValue: 1100,
    costBasis: 1000,
    unrealizedPnl: 100,
    realizedPnl: 0,
    openedAt: FIXED_TS,
    closedAt: null,
    updatedAt: FIXED_TS,
    ...overrides,
  };
}

export function makeWorkspace(overrides: Partial<SimulationWorkspace> = {}): SimulationWorkspace {
  return {
    summary: makeSummary(),
    positions: [],
    closedPositions: [],
    orders: [],
    transactions: [],
    snapshots: [],
    ...overrides,
  };
}

// Permissive mode that approves a manual order through every real gate.
// Individual tests narrow a single field (e.g. enabled, requireHumanApproval,
// maxPositionPercent) to drive one gate to a rejection.
export function makeModeConfig(overrides: Partial<BrokerModeConfig> = {}): BrokerModeConfig {
  return {
    id: 'manual_only',
    label: 'Manual Only',
    enabled: true,
    requiresVerifiedUser: false,
    requireHumanApproval: true,
    executionTarget: 'simulation',
    allowedAssetKinds: ['stock', 'etf', 'crypto'],
    capital: { maxAbsolute: 100_000, maxPercentOfCash: 1.0, maxPerTrade: 100_000 },
    risk: {
      maxPositionPercent: 1.0,
      maxOpenPositions: 50,
      maxDailyLossPercent: 1.0,
      maxDrawdownPercent: 1.0,
      minSignalConfidence: 0.0,
    },
    trading: {
      allowScalingIn: true,
      allowScalingOut: true,
      allowOvernight: true,
      allowWeekendCrypto: true,
      maxOrdersPerDay: 1000,
      cooldownMinutes: 0,
    },
    approvals: {
      requireFreshConsent: false,
      requireHealthyBrokerConnection: false,
      requireHealthyMarketData: false,
    },
    ...overrides,
  };
}

export function makeIntent(overrides: Partial<TradeIntentPayload> = {}): TradeIntentPayload {
  return {
    accountId: 'acc-1',
    modeId: 'manual_only',
    source: 'manual',
    symbol: 'AAPL',
    assetKind: 'stock',
    side: 'buy',
    sizingMode: 'notional',
    notional: 1000,
    thesis: 'Constructive trend with confirming momentum.',
    confidence: 0.8,
    ...overrides,
  };
}

export function makeBundle(overrides: Partial<IntelligenceDecisionBundle> = {}): IntelligenceDecisionBundle {
  return {
    symbol: 'AAPL',
    assetKind: 'stock',
    marketContext: { regime: 'risk_on', volatilityState: 'moderate' },
    signal: { direction: 'long', score: 0.6, confidence: 0.8 },
    generatedAt: FIXED_TS,
    ...overrides,
  };
}

export function makeOrderResult(overrides: Partial<ExecutionOrderResult> = {}): ExecutionOrderResult {
  return {
    orderId: 'exec-order-1',
    symbol: 'AAPL',
    side: 'buy',
    quantity: 10,
    executionPrice: 100,
    requestedPrice: 100,
    executionTarget: 'simulation',
    filledAt: new Date(FIXED_TS),
    status: 'filled',
    ...overrides,
  };
}

/** Simulation adapter whose submitOrder is a provided stub (defaults to success). */
export function makeAdapter(
  submitOrder: BrokerExecutionAdapter['submitOrder'],
  executionTarget: BrokerExecutionAdapter['executionTarget'] = 'simulation',
): BrokerExecutionAdapter {
  return { executionTarget, submitOrder };
}

export function okAdapterSubmit(result: ExecutionOrderResult = makeOrderResult()): BrokerExecutionAdapter['submitOrder'] {
  return async () => agentOk(result);
}
