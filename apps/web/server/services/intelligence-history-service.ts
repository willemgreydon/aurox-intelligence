import {
  getInvestmentUniverse,
  getMarketHistoryBarsBySymbols,
  recordSignalSnapshots,
  type SignalSnapshotRecord,
} from '@repo/db';
import { deriveSignalSnapshot } from '@repo/signals';

/**
 * Records a daily deterministic signal snapshot for the tradable universe into
 * `signal_history`, so that forward returns can later be attributed to what a
 * signal actually said (Phase F: signal accuracy / pattern expectancy). This is
 * the WRITER that makes those surfaces meaningful — history only accrues going
 * forward; nothing can be backfilled. Runs from the daily cron (and can be
 * invoked once to seed). Degrades to a no-op without a DB.
 */

const MAX_ASSETS = 60;
const HISTORY_BARS = 90;
const MIN_BARS = 20;

export async function recordUniverseSignalHistory(
  nowIso: string = new Date().toISOString(),
): Promise<{ recorded: number; considered: number }> {
  const universe = await getInvestmentUniverse().catch(() => []);
  const selected = universe.filter((asset) => asset.isSimulated).slice(0, MAX_ASSETS);
  if (selected.length === 0) {
    return { recorded: 0, considered: 0 };
  }

  const symbols = selected.map((asset) => asset.symbol);
  const barsBySymbol = await getMarketHistoryBarsBySymbols(symbols, HISTORY_BARS).catch(
    () => ({}) as Record<string, never[]>,
  );

  const records: SignalSnapshotRecord[] = [];
  for (const asset of selected) {
    const bars = barsBySymbol[asset.symbol] ?? [];
    if (bars.length < MIN_BARS) continue;
    const signal = deriveSignalSnapshot(
      asset.assetId,
      bars.map((bar) => bar.close),
    );
    records.push({
      assetId: asset.assetId,
      symbol: asset.symbol,
      assetClass: asset.assetClass,
      interpretation: signal.interpretation,
      compositeScore: signal.compositeScoreValue,
      confidence: signal.confidenceScore,
      latestPrice: signal.latestPrice,
      generatedAt: nowIso,
    });
  }

  if (records.length > 0) {
    await recordSignalSnapshots(records);
  }
  return { recorded: records.length, considered: selected.length };
}
