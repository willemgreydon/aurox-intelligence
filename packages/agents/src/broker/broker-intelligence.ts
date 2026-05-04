import type { BrokerReadinessStatus, BrokerOrderPreview, OrderSimulationResult } from './broker-abstraction';

export type BrokerRiskFlag =
  | 'LOW_LIQUIDITY'
  | 'HIGH_NEWS_RISK'
  | 'CONSTRAINT_VIOLATION'
  | 'READINESS_FAILURE'
  | 'INSUFFICIENT_CASH'
  | 'POSITION_LIMIT'
  | 'DEGRADED_DATA';

export type BrokerDecision = {
  executable: boolean;
  simulationOnly: true;
  liveAllowed: false;
  reason: string;
  estimatedFillPrice: number;
  estimatedSlippage: number;
  estimatedFees: number;
  estimatedLatencyMs: number;
  riskFlags: BrokerRiskFlag[];
  riskWarnings: string[];
  readinessState: BrokerReadinessStatus;
  explanation: string;
};

export type BrokerIntelligenceInput = {
  order: BrokerOrderPreview;
  marketPrice: number;
  cashBalance: number;
  portfolioValue: number;
  openPositionCount: number;
  newsRiskFlag?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  liquidityScore?: number;
  signalConfidence?: number;
  providerDegraded?: boolean;
  readiness: BrokerReadinessStatus;
  minSignalConfidence?: number;
  maxOpenPositions?: number;
};

export function evaluateBrokerDecision(input: BrokerIntelligenceInput): BrokerDecision {
  const {
    order,
    marketPrice,
    cashBalance,
    openPositionCount,
    newsRiskFlag = 'LOW',
    liquidityScore = 1,
    signalConfidence = 1,
    providerDegraded = false,
    readiness,
    minSignalConfidence = 0.3,
    maxOpenPositions = 20,
  } = input;

  const riskFlags: BrokerRiskFlag[] = [];
  const riskWarnings: string[] = [];
  const blockingReasons: string[] = [];

  // Readiness gate
  if (!readiness.ready) {
    riskFlags.push('READINESS_FAILURE');
    blockingReasons.push(`Broker readiness failed: ${readiness.summary}`);
  }

  // News risk gate
  if (newsRiskFlag === 'CRITICAL') {
    riskFlags.push('HIGH_NEWS_RISK');
    blockingReasons.push('Critical news risk detected — simulation execution blocked pending review.');
  } else if (newsRiskFlag === 'HIGH') {
    riskFlags.push('HIGH_NEWS_RISK');
    riskWarnings.push('High news risk: manual review recommended before executing.');
  }

  // Liquidity check
  if (liquidityScore < 0.2) {
    riskFlags.push('LOW_LIQUIDITY');
    blockingReasons.push(`Liquidity score ${(liquidityScore * 100).toFixed(0)}% is too low for order execution.`);
  } else if (liquidityScore < 0.4) {
    riskFlags.push('LOW_LIQUIDITY');
    riskWarnings.push(`Low liquidity (${(liquidityScore * 100).toFixed(0)}%): slippage may be elevated.`);
  }

  // Signal confidence gate
  if (signalConfidence < minSignalConfidence) {
    riskFlags.push('DEGRADED_DATA');
    blockingReasons.push(`Signal confidence ${(signalConfidence * 100).toFixed(0)}% below minimum ${(minSignalConfidence * 100).toFixed(0)}%.`);
  }

  // Provider degradation warning
  if (providerDegraded) {
    riskFlags.push('DEGRADED_DATA');
    riskWarnings.push('Market data provider is degraded — price estimates may be imprecise.');
  }

  // Cash availability
  const estimatedNotional = marketPrice * order.quantity;
  if (order.side === 'buy' && estimatedNotional > cashBalance) {
    riskFlags.push('INSUFFICIENT_CASH');
    blockingReasons.push(`Estimated notional $${estimatedNotional.toFixed(2)} exceeds cash $${cashBalance.toFixed(2)}.`);
  }

  // Position limit
  if (order.side === 'buy' && openPositionCount >= maxOpenPositions) {
    riskFlags.push('POSITION_LIMIT');
    blockingReasons.push(`Position limit reached: ${openPositionCount}/${maxOpenPositions} open positions.`);
  }

  // Basic constraint check
  if (order.quantity <= 0) {
    riskFlags.push('CONSTRAINT_VIOLATION');
    blockingReasons.push('Invalid order quantity: must be positive.');
  }

  const executable = blockingReasons.length === 0;

  // Compute fill estimates regardless (for display)
  const slippagePct = order.orderType === 'market' ? 0.001 : 0;
  const slippage = marketPrice * slippagePct;
  const fillPrice = order.side === 'buy' ? marketPrice + slippage : marketPrice - slippage;
  const fees = Math.max(fillPrice * order.quantity * 0.0005, 0);

  const reason = executable
    ? 'Order passes all simulation execution checks.'
    : blockingReasons[0] ?? 'Order blocked by risk controls.';

  const explanation = [
    executable
      ? `Order for ${order.quantity} ${order.symbol} is eligible for simulation execution.`
      : `Order blocked: ${blockingReasons.join(' ')}`,
    `Estimated fill: $${fillPrice.toFixed(4)}, slippage: $${slippage.toFixed(4)}, fees: $${fees.toFixed(4)}.`,
    riskWarnings.length > 0 ? `Warnings: ${riskWarnings.join(' ')}` : '',
    'Live execution is permanently locked — simulation only.',
  ].filter(Boolean).join(' ');

  return {
    executable,
    simulationOnly: true,
    liveAllowed: false,
    reason,
    estimatedFillPrice: fillPrice,
    estimatedSlippage: slippage,
    estimatedFees: fees,
    estimatedLatencyMs: 50,
    riskFlags,
    riskWarnings,
    readinessState: readiness,
    explanation,
  };
}

export function buildBrokerDecisionFromSimulation(
  simulation: OrderSimulationResult,
  readiness: BrokerReadinessStatus,
  blockingReasons: string[],
  riskFlags: BrokerRiskFlag[],
): BrokerDecision {
  return {
    executable: blockingReasons.length === 0 && readiness.ready,
    simulationOnly: true,
    liveAllowed: false,
    reason: blockingReasons[0] ?? 'Simulation execution approved.',
    estimatedFillPrice: simulation.estimatedFillPrice,
    estimatedSlippage: simulation.estimatedSlippage,
    estimatedFees: simulation.estimatedFees,
    estimatedLatencyMs: simulation.estimatedLatencyMs,
    riskFlags,
    riskWarnings: simulation.riskWarnings,
    readinessState: readiness,
    explanation: `Simulation preview: fill $${simulation.estimatedFillPrice.toFixed(4)}, fees $${simulation.estimatedFees.toFixed(4)}. Live execution locked.`,
  };
}
