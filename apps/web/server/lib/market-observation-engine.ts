export type ObservationSeverity = 'INFO' | 'WATCH' | 'WARNING' | 'CRITICAL';
export type ObservationSource = 'signal' | 'news' | 'risk' | 'provider' | 'portfolio' | 'anomaly';
export type ObservationAction = 'inspect' | 'add_to_watchlist' | 'open_signal' | 'open_simulation_ticket' | 'ignore';
export type RegimeLabel =
  | 'risk-on'
  | 'risk-off'
  | 'trend-up'
  | 'trend-down'
  | 'sideways'
  | 'high-volatility'
  | 'low-liquidity'
  | 'news-driven';

export type TimelineEventType =
  | 'price_breakout'
  | 'volume_spike'
  | 'volatility_spike'
  | 'signal_flip'
  | 'news_shock'
  | 'provider_degradation'
  | 'portfolio_risk_change'
  | 'simulated_order_event'
  | 'broker_decision_event';

export type AnomalyType =
  | 'price_spike'
  | 'volume_anomaly'
  | 'volatility_explosion'
  | 'confidence_drop'
  | 'correlation_breakdown'
  | 'provider_staleness'
  | 'news_sentiment_shift';

export type TradeReadinessStatus =
  | 'READY_FOR_SIMULATION'
  | 'WATCH_ONLY'
  | 'BLOCKED_BY_RISK'
  | 'BLOCKED_BY_DATA_QUALITY'
  | 'BLOCKED_BY_GUARDRAIL';

export type ObservationItem = {
  id: string;
  title: string;
  severity: ObservationSeverity;
  reason: string;
  confidence: number;
  source: ObservationSource;
  createdAt: string;
  recommendedNextAction: ObservationAction;
  assetSymbol?: string | null;
  assetClass?: 'stock' | 'etf' | 'crypto' | 'other' | null;
};

export type MarketTimelineEvent = {
  id: string;
  timestamp: string;
  eventType: TimelineEventType;
  severity: ObservationSeverity;
  description: string;
  actionHref: string;
  assetSymbol?: string | null;
  assetClass?: 'stock' | 'etf' | 'crypto' | 'other' | null;
  relatedId?: string | null;
};

export type AnomalyRadarItem = {
  id: string;
  assetSymbol: string;
  assetClass: 'stock' | 'etf' | 'crypto' | 'other';
  anomalyType: AnomalyType;
  anomalyScore: number;
  severity: ObservationSeverity;
  explanation: string;
  detectedAt: string;
  inspectionHref: string;
};

export type TradeReadinessBreakdown = {
  signalAlignment: number | null;
  confidence: number | null;
  riskScore: number | null;
  spreadSlippageWarning: ObservationSeverity;
  liquidityCondition: ObservationSeverity;
  newsCondition: ObservationSeverity;
  portfolioExposureImpact: ObservationSeverity;
  microTradingSuitability: ObservationSeverity;
  guardrailResult: ObservationSeverity;
  status: TradeReadinessStatus;
  explanation: string[];
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function severityFromScore(score: number): ObservationSeverity {
  if (score >= 75) return 'CRITICAL';
  if (score >= 50) return 'WARNING';
  if (score >= 25) return 'WATCH';
  return 'INFO';
}

export function computeAnomalyScore(input: {
  priceShock: number | null;
  volatilityShock: number | null;
  confidenceDrop: number | null;
  correlationBreakdown: number | null;
  providerStaleness: number | null;
  newsShock: number | null;
  liquidityStress: number | null;
}): number | null {
  const parts = [
    input.priceShock,
    input.volatilityShock,
    input.confidenceDrop,
    input.correlationBreakdown,
    input.providerStaleness,
    input.newsShock,
    input.liquidityStress,
  ].filter((value): value is number => value !== null && Number.isFinite(value));

  if (parts.length === 0) return null;

  return clamp(
    (clamp(input.priceShock ?? 0, 0, 1) * 22
      + clamp(input.volatilityShock ?? 0, 0, 1) * 18
      + clamp(input.confidenceDrop ?? 0, 0, 1) * 14
      + clamp(input.correlationBreakdown ?? 0, 0, 1) * 14
      + clamp(input.providerStaleness ?? 0, 0, 1) * 12
      + clamp(input.newsShock ?? 0, 0, 1) * 12
      + clamp(input.liquidityStress ?? 0, 0, 1) * 8),
    0,
    100,
  );
}

export function mapRiskToSeverity(riskScore: number | null): ObservationSeverity {
  if (riskScore === null || !Number.isFinite(riskScore)) return 'WATCH';
  return severityFromScore(clamp(riskScore, 0, 100));
}

export function detectMarketRegime(input: {
  averageSignalScore: number | null; // -1..1
  averageConfidence: number | null; // 0..1
  breadth: number | null; // 0..1 bullish participation
  newsSentiment: number | null; // -1..1
  cryptoVolatility: number | null; // 0..1
  providerQuality: number | null; // 0..1, higher better
  liquidityStress: number | null; // 0..1
}): {
  label: RegimeLabel;
  confidence: number;
  factors: string[];
  updatedAt: string;
  explanation: string;
} {
  const signal = input.averageSignalScore ?? 0;
  const breadth = input.breadth ?? 0.5;
  const sentiment = input.newsSentiment ?? 0;
  const cryptoVol = input.cryptoVolatility ?? 0.5;
  const providerQuality = input.providerQuality ?? 0.5;
  const liquidityStress = input.liquidityStress ?? 0.5;
  const avgConfidence = input.averageConfidence ?? 0.5;

  let label: RegimeLabel = 'sideways';
  const factors: string[] = [];

  if (providerQuality < 0.45) {
    label = 'low-liquidity';
    factors.push('Provider/data quality degraded');
  } else if (cryptoVol > 0.72) {
    label = 'high-volatility';
    factors.push('Crypto volatility elevated');
  } else if (Math.abs(sentiment) > 0.55) {
    label = 'news-driven';
    factors.push('News sentiment dominates');
  } else if (signal > 0.18 && breadth > 0.55) {
    label = liquidityStress > 0.62 ? 'risk-off' : 'risk-on';
    factors.push('Positive average signal and breadth');
  } else if (signal < -0.18 && breadth < 0.45) {
    label = 'risk-off';
    factors.push('Negative average signal and weak breadth');
  } else if (signal > 0.3) {
    label = 'trend-up';
    factors.push('Trend/momentum composite is positive');
  } else if (signal < -0.3) {
    label = 'trend-down';
    factors.push('Trend/momentum composite is negative');
  } else {
    label = 'sideways';
    factors.push('Mixed signals');
  }

  const confidence = clamp(
    avgConfidence * 0.45
      + Math.min(1, Math.abs(signal)) * 0.2
      + Math.min(1, Math.abs(sentiment)) * 0.15
      + (1 - liquidityStress) * 0.1
      + providerQuality * 0.1,
    0,
    1,
  );

  return {
    label,
    confidence,
    factors,
    updatedAt: new Date().toISOString(),
    explanation: `Regime ${label} with ${(confidence * 100).toFixed(0)}% confidence from signal, breadth, news, volatility, and provider quality factors.`,
  };
}

export function computeTradeReadiness(input: {
  signalAlignment: number | null; // -1..1
  confidence: number | null; // 0..1
  riskScore: number | null; // 0..100
  liquidityScore: number | null; // 0..1
  newsRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | null;
  providerDegraded: boolean;
  portfolioConcentrationRisk: number | null; // 0..1
  microTradingFit: number | null; // 0..1
}): TradeReadinessBreakdown {
  const explanation: string[] = [];
  const signal = input.signalAlignment ?? 0;
  const conf = input.confidence ?? 0;
  const risk = input.riskScore ?? 100;
  const liquidity = input.liquidityScore ?? 0;
  const concentration = input.portfolioConcentrationRisk ?? 1;
  const microFit = input.microTradingFit ?? 0;

  if (input.providerDegraded) {
    explanation.push('Provider quality is degraded; simulation ticket should be blocked.');
  }
  if (risk >= 75) explanation.push('Composite risk is extreme.');
  if (input.newsRisk === 'CRITICAL') explanation.push('Critical news risk detected.');
  if (liquidity < 0.25) explanation.push('Liquidity conditions are weak.');
  if (concentration > 0.6) explanation.push('Portfolio concentration impact is elevated.');

  let status: TradeReadinessStatus;
  if (input.providerDegraded) {
    status = 'BLOCKED_BY_DATA_QUALITY';
  } else if (risk >= 75 || input.newsRisk === 'CRITICAL') {
    status = 'BLOCKED_BY_RISK';
  } else if (conf < 0.35 || signal < -0.1 || liquidity < 0.2) {
    status = 'WATCH_ONLY';
  } else if (concentration > 0.75 || microFit < 0.25) {
    status = 'BLOCKED_BY_GUARDRAIL';
  } else {
    status = 'READY_FOR_SIMULATION';
  }

  const spreadSlippageWarning: ObservationSeverity = liquidity < 0.35 ? 'WARNING' : liquidity < 0.55 ? 'WATCH' : 'INFO';
  const liquidityCondition: ObservationSeverity = liquidity < 0.2 ? 'CRITICAL' : liquidity < 0.45 ? 'WARNING' : 'INFO';
  const newsCondition: ObservationSeverity =
    input.newsRisk === 'CRITICAL' ? 'CRITICAL'
      : input.newsRisk === 'HIGH' ? 'WARNING'
        : input.newsRisk === 'MEDIUM' ? 'WATCH'
          : 'INFO';
  const portfolioExposureImpact: ObservationSeverity = concentration > 0.75 ? 'CRITICAL' : concentration > 0.55 ? 'WARNING' : concentration > 0.35 ? 'WATCH' : 'INFO';
  const microTradingSuitability: ObservationSeverity = microFit < 0.2 ? 'CRITICAL' : microFit < 0.4 ? 'WARNING' : microFit < 0.6 ? 'WATCH' : 'INFO';
  const guardrailResult: ObservationSeverity =
    status === 'READY_FOR_SIMULATION' ? 'INFO'
      : status === 'WATCH_ONLY' ? 'WATCH'
        : status === 'BLOCKED_BY_DATA_QUALITY' ? 'CRITICAL'
          : 'WARNING';

  if (explanation.length === 0) {
    explanation.push('Signal, confidence, risk, liquidity, and portfolio checks pass deterministic guardrails.');
  }

  return {
    signalAlignment: input.signalAlignment,
    confidence: input.confidence,
    riskScore: input.riskScore,
    spreadSlippageWarning,
    liquidityCondition,
    newsCondition,
    portfolioExposureImpact,
    microTradingSuitability,
    guardrailResult,
    status,
    explanation,
  };
}
