import type { SignalSnapshot } from '@repo/signals';
import type { MarketInsightSummary } from '@repo/api-contracts';
import type { AssetKind } from '../types/broker-types';
import type {
  IntelligenceDecisionBundle,
  SignalDirection,
  IntelligenceTradePlan,
} from '../types/execution-types';
import {
  classifyVolatility,
  synthesizeSignal,
  synthesizeFactors,
} from './signal-synthesis-agent';
import { synthesizeMarketContext } from './market-intelligence-agent';

function inferEntryStyle(
  assetKind: AssetKind,
  signalScore: number,
): IntelligenceTradePlan['entryStyle'] {
  if (assetKind === 'crypto' && Math.abs(signalScore) >= 0.7) {
    return 'staged';
  }

  if (Math.abs(signalScore) >= 0.5) {
    return 'market';
  }

  return 'limit';
}

function buildTradePlan(input: {
  assetKind: AssetKind;
  direction: SignalDirection;
  signalScore: number;
  volatilityValue?: number | null;
}): IntelligenceTradePlan {
  const { assetKind, direction, signalScore, volatilityValue } = input;

  const entryStyle = inferEntryStyle(assetKind, signalScore);

  const thesisBase =
    direction === 'long'
      ? 'Signal stack favors upside continuation with controlled risk.'
      : direction === 'short'
        ? 'Signal stack favors downside continuation with disciplined entries.'
        : 'Signal stack is mixed and does not justify aggressive positioning.';

  const volatilityHint =
    typeof volatilityValue === 'number' && Number.isFinite(volatilityValue)
      ? volatilityValue >= 2
        ? ' Elevated volatility suggests tighter controls and smaller sizing.'
        : volatilityValue <= 0.75
          ? ' Lower volatility supports cleaner execution conditions.'
          : ' Moderate volatility favors standard guardrails.'
      : '';

  return {
    entryStyle,
    thesis: `${thesisBase}${volatilityHint}`.trim(),
  };
}

export function buildIntelligenceBundle(
  symbol: string,
  assetKind: AssetKind,
  snapshot: SignalSnapshot,
  insight: MarketInsightSummary,
): IntelligenceDecisionBundle {
  const signal = synthesizeSignal(snapshot);
  const factors = synthesizeFactors(snapshot);
  const volatilityState = classifyVolatility(snapshot.volatilityValue);
  const marketContext = synthesizeMarketContext(
    insight,
    signal.direction,
    volatilityState,
  );

  return {
    symbol,
    assetKind,
    marketContext,
    signal,
    factors,
    tradePlan: buildTradePlan({
      assetKind,
      direction: signal.direction,
      signalScore: signal.score,
      volatilityValue: snapshot.volatilityValue,
    }),
    generatedAt: new Date().toISOString(),
  };
}

export function buildManualTradeBundle(
  symbol: string,
  assetKind: AssetKind,
  side: 'buy' | 'sell',
  confidence: number,
): IntelligenceDecisionBundle {
  const direction: SignalDirection = side === 'buy' ? 'long' : 'short';

  return {
    symbol,
    assetKind,
    signal: {
      direction,
      score: 0,
      confidence,
    },
    marketContext: {
      regime: 'transitional',
      volatilityState: 'moderate',
    },
    tradePlan: {
      entryStyle: 'market',
      thesis:
        side === 'buy'
          ? 'Manual trade input indicates an upside conviction with direct execution intent.'
          : 'Manual trade input indicates a downside conviction with direct execution intent.',
    },
    generatedAt: new Date().toISOString(),
  };
}