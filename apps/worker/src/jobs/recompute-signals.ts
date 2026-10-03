import {
  getInvestmentUniverse,
  getMarketHistoryBarsBySymbols,
  recordSignalSnapshots,
  type SignalSnapshotRecord,
} from '@repo/db';
import { deriveSignalSnapshot } from '@repo/signals';

/**
 * Incremental signal recomputation job.
 *
 * Checks every investment-universe asset and generates a signal snapshot for
 * today if one has not already been recorded (the unique constraint on
 * (asset_id, generated_date) makes the insert a no-op if it already exists).
 *
 * This job is intentionally lightweight — it is a safety net for the Vercel
 * Cron path: if the cron fails or the worker is the primary execution context,
 * this job ensures signals are recorded. It does NOT walk backwards through
 * history or fill gaps beyond today.
 */

const MAX_ASSETS = 60;
const HISTORY_BARS = 90;
const MIN_BARS = 20;

export async function recomputeSignalsJob(): Promise<{
  ok: boolean;
  job: string;
  recorded: number;
  skipped: number;
  considered: number;
}> {
  const nowIso = new Date().toISOString();
  const universe = await getInvestmentUniverse().catch(() => []);
  const selected = universe.filter((asset) => asset.isSimulated).slice(0, MAX_ASSETS);

  if (selected.length === 0) {
    return { ok: true, job: 'recompute-signals', recorded: 0, skipped: 0, considered: 0 };
  }

  const symbols = selected.map((asset) => asset.symbol);
  const barsBySymbol = await getMarketHistoryBarsBySymbols(symbols, HISTORY_BARS).catch(
    () => ({}) as Record<string, never[]>,
  );

  const records: SignalSnapshotRecord[] = [];
  let skipped = 0;

  for (const asset of selected) {
    const bars = barsBySymbol[asset.symbol] ?? [];
    if (bars.length < MIN_BARS) {
      skipped++;
      continue;
    }
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
    // ON CONFLICT DO NOTHING — idempotent if already run today.
    await recordSignalSnapshots(records);
  }

  return {
    ok: true,
    job: 'recompute-signals',
    recorded: records.length,
    skipped,
    considered: selected.length,
  };
}
