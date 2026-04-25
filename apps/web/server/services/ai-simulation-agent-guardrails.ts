import type { AiSimulationAgentRequest, AssetRanking } from '@repo/api-contracts';

export type AiDailyNotionalCapDecision =
  | { allowed: true; usedToday: number; remaining: number }
  | { allowed: false; reason: string; usedToday: number; remaining: number };

const AI_RANKED_ASSET_LIMIT = 10;

export function evaluateAiDailyNotionalCap(input: {
  usedToday: number;
  proposedNotional: number;
  maxDailyNotional: number;
}): AiDailyNotionalCapDecision {
  const usedToday = Number.isFinite(input.usedToday) ? input.usedToday : Number.NaN;
  const proposedNotional = Number.isFinite(input.proposedNotional)
    ? input.proposedNotional
    : Number.NaN;
  const maxDailyNotional = Number.isFinite(input.maxDailyNotional)
    ? input.maxDailyNotional
    : Number.NaN;

  if (!Number.isFinite(usedToday) || usedToday < 0) {
    return {
      allowed: false,
      reason: 'Daily notional check failed because prior AI notional usage could not be determined.',
      usedToday: 0,
      remaining: 0,
    };
  }

  if (!Number.isFinite(proposedNotional) || proposedNotional <= 0) {
    return {
      allowed: false,
      reason: 'Daily notional check rejected a non-positive proposed notional.',
      usedToday,
      remaining: 0,
    };
  }

  if (!Number.isFinite(maxDailyNotional) || maxDailyNotional <= 0) {
    return {
      allowed: false,
      reason: 'Autonomous simulation is disabled because maxDailyNotional is not greater than zero.',
      usedToday,
      remaining: 0,
    };
  }

  const projected = usedToday + proposedNotional;
  if (projected > maxDailyNotional) {
    return {
      allowed: false,
      reason:
        `Daily notional cap exceeded: used $${usedToday.toFixed(2)} + proposed ` +
        `$${proposedNotional.toFixed(2)} > cap $${maxDailyNotional.toFixed(2)}.`,
      usedToday,
      remaining: Math.max(0, maxDailyNotional - usedToday),
    };
  }

  return {
    allowed: true,
    usedToday,
    remaining: Math.max(0, maxDailyNotional - projected),
  };
}

export function mapRankedAssetsForAgent(
  rankedAssets: AssetRanking[],
): AiSimulationAgentRequest['rankedAssets'] {
  return rankedAssets.slice(0, AI_RANKED_ASSET_LIMIT).map((asset) => ({
    symbol: asset.symbol,
    assetKind: asset.assetKind,
    recommendation: asset.recommendation,
    score: asset.score,
    confidence: asset.confidence,
    explanation: asset.explanation,
    riskSummary: asset.riskSummary,
    signalSummary: asset.signalSummary,
  }));
}
