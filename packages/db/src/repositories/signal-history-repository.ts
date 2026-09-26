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
