import type { MarketTick, TradeEvent } from './contracts';

export type SpreadAlert = {
  symbol: string;
  provider: string;
  spreadPct: number;
  message: string;
};

export function detectSpreadAlert(tick: MarketTick, thresholdPct = 0.4): SpreadAlert | null {
  if (tick.bid === null || tick.ask === null || tick.price <= 0) return null;
  const spreadPct = ((tick.ask - tick.bid) / tick.price) * 100;
  if (spreadPct < thresholdPct) return null;
  return {
    symbol: tick.normalizedSymbol,
    provider: tick.provider,
    spreadPct,
    message: `Spread widened to ${spreadPct.toFixed(2)}%`,
  };
}

export type VolatilityBurstSignal = {
  symbol: string;
  magnitudePct: number;
  direction: 'up' | 'down';
  message: string;
};

export function detectVolatilityBurst(
  previous: MarketTick,
  current: MarketTick,
  thresholdPct = 1.25,
): VolatilityBurstSignal | null {
  if (previous.normalizedSymbol !== current.normalizedSymbol) return null;
  if (previous.price <= 0) return null;
  const deltaPct = ((current.price - previous.price) / previous.price) * 100;
  if (Math.abs(deltaPct) < thresholdPct) return null;
  return {
    symbol: current.normalizedSymbol,
    magnitudePct: Math.abs(deltaPct),
    direction: deltaPct > 0 ? 'up' : 'down',
    message: `Volatility burst ${deltaPct > 0 ? 'up' : 'down'} ${Math.abs(deltaPct).toFixed(2)}%`,
  };
}

export type CrossExchangeDivergence = {
  symbol: string;
  leftProvider: string;
  rightProvider: string;
  divergencePct: number;
};

export function detectCrossExchangeDivergence(
  left: MarketTick,
  right: MarketTick,
  thresholdPct = 0.6,
): CrossExchangeDivergence | null {
  if (left.normalizedSymbol !== right.normalizedSymbol) return null;
  if (left.price <= 0 || right.price <= 0) return null;
  const base = Math.min(left.price, right.price);
  const divergencePct = (Math.abs(left.price - right.price) / base) * 100;
  if (divergencePct < thresholdPct) return null;
  return {
    symbol: left.normalizedSymbol,
    leftProvider: left.provider,
    rightProvider: right.provider,
    divergencePct,
  };
}

export function classifyTradeSideDrift(trades: TradeEvent[]): 'buy-pressure' | 'sell-pressure' | 'balanced' {
  if (trades.length === 0) return 'balanced';
  const score = trades.reduce((sum, trade) => sum + (trade.side === 'buy' ? 1 : trade.side === 'sell' ? -1 : 0), 0);
  if (score > trades.length * 0.2) return 'buy-pressure';
  if (score < -trades.length * 0.2) return 'sell-pressure';
  return 'balanced';
}
