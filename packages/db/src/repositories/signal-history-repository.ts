import { createDatabaseClient, type DatabaseClient } from '../client';
import { signalHistoryTable } from '../schema/signal-history';

/**
 * Append-only persistence of deterministic signal snapshots so forward returns
 * can later be attributed to what a signal actually said (empirical accuracy /
 * expectancy surfaces). No backfill exists — history accrues going forward.
 *
 * Follows the repo convention: stub client → no-op; a missing table/column
 * (schema not yet migrated) degrades gracefully rather than throwing.
 */

export interface SignalSnapshotRecord {
  assetId: string;
  symbol: string;
  assetClass?: string | null;
  interpretation: 'bullish' | 'bearish' | 'neutral';
  /** Composite score in [-1, 1]. */
  compositeScore: number;
  /** Confidence in [0, 1]. */
  confidence: number;
  latestPrice?: number | null;
  /** Engine-injected ISO timestamp — never a DB clock. */
  generatedAt: string;
}

export interface SignalHistoryPoint {
  assetId: string;
  symbol: string;
  interpretation: 'bullish' | 'bearish' | 'neutral';
  compositeScore: number;
  confidence: number;
  latestPrice: number | null;
  generatedAt: string;
}

type SignalHistoryRow = {
  assetId: string;
  symbol: string;
  interpretation: string;
  compositeScore: string | number;
  confidence: string | number;
  latestPrice: string | number | null;
  generatedAt: string | Date;
};

function isMissingSchemaError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('code' in error)) return false;
  const code = (error as { code?: string }).code;
  return code === '42P01' || code === '42703';
}

function getConfiguredClient(): DatabaseClient | null {
  const client = createDatabaseClient();
  return client.isConfigured ? client : null;
}

function toIso(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : value;
}

function toNumber(value: string | number | null): number | null {
  if (value === null) return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toInterpretation(value: string): 'bullish' | 'bearish' | 'neutral' {
  return value === 'bullish' || value === 'bearish' ? value : 'neutral';
}

/** Persist a batch of signal snapshots atomically. Silently no-ops without a DB. */
export async function recordSignalSnapshots(records: readonly SignalSnapshotRecord[]): Promise<void> {
  if (records.length === 0) return;
  const client = getConfiguredClient();
  if (!client) return;

  try {
    await client.transaction(async (tx) => {
      for (const record of records) {
        await tx.execute(
          `
            insert into ${signalHistoryTable} (
              asset_id, symbol, asset_class, interpretation,
              composite_score, confidence, latest_price, generated_at
            ) values ($1, $2, $3, $4, $5, $6, $7, $8)
          `,
          [
            record.assetId,
            record.symbol,
            record.assetClass ?? null,
            record.interpretation,
            record.compositeScore,
            record.confidence,
            record.latestPrice ?? null,
            record.generatedAt,
          ],
        );
      }
    });
  } catch (error) {
    if (isMissingSchemaError(error)) return; // schema not migrated yet — degrade
    throw error;
  }
}

export async function recordSignalSnapshot(record: SignalSnapshotRecord): Promise<void> {
  await recordSignalSnapshots([record]);
}

/** Read recent signal history for an asset, newest first. Empty without a DB. */
export async function getSignalHistory(assetId: string, limit = 90): Promise<SignalHistoryPoint[]> {
  const client = getConfiguredClient();
  if (!client) return [];

  try {
    const rows = await client.query<SignalHistoryRow>(
      `
        select
          asset_id as "assetId",
          symbol as "symbol",
          interpretation as "interpretation",
          composite_score as "compositeScore",
          confidence as "confidence",
          latest_price as "latestPrice",
          generated_at as "generatedAt"
        from ${signalHistoryTable}
        where asset_id = $1
        order by generated_at desc
        limit $2
      `,
      [assetId, limit],
    );

    return rows.map((row) => ({
      assetId: row.assetId,
      symbol: row.symbol,
      interpretation: toInterpretation(row.interpretation),
      compositeScore: toNumber(row.compositeScore) ?? 0,
      confidence: toNumber(row.confidence) ?? 0,
      latestPrice: toNumber(row.latestPrice),
      generatedAt: toIso(row.generatedAt),
    }));
  } catch (error) {
    if (isMissingSchemaError(error)) return [];
    throw error;
  }
}

export interface SignalAccuracyRow {
  interpretation: 'bullish' | 'bearish';
  /** Number of recorded signals of this interpretation with a forward outcome. */
  total: number;
  /** Average subsequent return over the horizon (%). */
  avgForwardReturnPct: number;
  /** How many moved in the signalled direction. */
  directionalHits: number;
}

type AccuracyDbRow = {
  interpretation: string;
  total: string | number;
  avgForwardReturnPct: string | number | null;
  directionalHits: string | number;
};

/**
 * Empirical signal accuracy: joins recorded signals to the actual price path
 * `horizonDays` later (from app.market_daily_bars) and reports, per bullish /
 * bearish interpretation, the sample size, average forward return, and how many
 * moved in the signalled direction. Returns [] until history accrues. The SQL
 * (base/forward lateral joins + directional-hit filter) is verified against real
 * price data.
 */
export async function getSignalAccuracy(horizonDays = 10): Promise<SignalAccuracyRow[]> {
  const client = getConfiguredClient();
  if (!client) return [];

  try {
    const rows = await client.query<AccuracyDbRow>(
      `
        with signals as (
          select symbol, interpretation, generated_at::date as sig_date
          from ${signalHistoryTable}
          where interpretation in ('bullish', 'bearish')
        ),
        joined as (
          select s.interpretation, base.close as base_close, fwd.close as fwd_close
          from signals s
          join lateral (
            select close from app.market_daily_bars
            where symbol = s.symbol and observed_on <= s.sig_date
            order by observed_on desc limit 1
          ) base on true
          join lateral (
            select close from app.market_daily_bars
            where symbol = s.symbol and observed_on >= (s.sig_date + $1::int)
            order by observed_on asc limit 1
          ) fwd on true
        )
        select
          interpretation,
          count(*)::int as "total",
          round(avg((fwd_close - base_close) / base_close) * 100, 2)::float8 as "avgForwardReturnPct",
          count(*) filter (
            where (interpretation = 'bullish' and fwd_close > base_close)
               or (interpretation = 'bearish' and fwd_close < base_close)
          )::int as "directionalHits"
        from joined
        group by interpretation
        order by interpretation
      `,
      [horizonDays],
    );

    return rows.map((row) => ({
      interpretation: row.interpretation === 'bearish' ? 'bearish' : 'bullish',
      total: toNumber(row.total) ?? 0,
      avgForwardReturnPct: toNumber(row.avgForwardReturnPct) ?? 0,
      directionalHits: toNumber(row.directionalHits) ?? 0,
    }));
  } catch (error) {
    if (isMissingSchemaError(error)) return [];
    throw error;
  }
}
