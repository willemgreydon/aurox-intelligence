import { createDatabaseClient, type DatabaseClient } from '../client';
import { forecastsTable } from '../schema/forecasts';

/**
 * Write-path for the `forecasts` table. The table existed since migration 0002
 * but had no writer — forecasts were computed on demand and discarded, so no
 * historical record could be compared against reality. This wires persistence
 * (with the reference price + symbol added in migration 0020) so a stored
 * forecast can later be joined to the realized path in market_daily_bars.
 *
 * Requires `asset_id` to reference an existing `assets` row (FK from 0002); a
 * FK violation is treated like a missing-schema degradation (skip, don't crash),
 * so persisting a forecast never breaks the request that produced it.
 */

export interface ForecastRecord {
  assetId: string;
  symbol?: string | null;
  horizon: 'short' | 'medium' | 'long';
  directionalBias: 'bullish' | 'bearish' | 'neutral';
  /** Confidence in [0, 1]. */
  confidenceScore: number;
  scenarioSummary: string;
  /** Price at production time — the anchor forward return is measured from. */
  referencePrice?: number | null;
  /** Engine-injected ISO timestamp — never a DB clock. */
  generatedAt: string;
}

export interface ForecastHistoryPoint {
  assetId: string;
  symbol: string | null;
  horizon: string;
  directionalBias: string;
  confidenceScore: number;
  referencePrice: number | null;
  producedAt: string;
}

type ForecastHistoryRow = {
  assetId: string;
  symbol: string | null;
  horizon: string;
  directionalBias: string;
  confidenceScore: string | number;
  referencePrice: string | number | null;
  producedAt: string | Date;
};

function isRecoverableWriteError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('code' in error)) return false;
  const code = (error as { code?: string }).code;
  // 42P01 undefined_table, 42703 undefined_column, 23503 foreign_key_violation.
  return code === '42P01' || code === '42703' || code === '23503';
}

function isMissingSchemaError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('code' in error)) return false;
  const code = (error as { code?: string }).code;
  return code === '42P01' || code === '42703';
}

function getConfiguredClient(): DatabaseClient | null {
  const client = createDatabaseClient();
  return client.isConfigured ? client : null;
}

function toNumber(value: string | number | null): number | null {
  if (value === null) return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Persist a computed forecast. No-ops without a DB; degrades on schema/FK gaps. */
export async function recordForecast(record: ForecastRecord): Promise<void> {
  const client = getConfiguredClient();
  if (!client) return;

  try {
    // generated_date = UTC calendar date of generated_at, stored for the unique
    // constraint (uq_forecasts_asset_date). ON CONFLICT DO NOTHING = idempotent.
    const generatedDate = record.generatedAt.substring(0, 10);
    await client.execute(
      `
        insert into ${forecastsTable} (
          asset_id, symbol, horizon, directional_bias,
          confidence_score, scenario_summary, reference_price,
          produced_at, generated_at, generated_date
        ) values ($1, $2, $3, $4, $5, $6, $7, $8, $8, $9)
        on conflict (asset_id, generated_date) do nothing
      `,
      [
        record.assetId,
        record.symbol ?? null,
        record.horizon,
        record.directionalBias,
        record.confidenceScore,
        record.scenarioSummary,
        record.referencePrice ?? null,
        record.generatedAt,
        generatedDate,
      ],
    );
  } catch (error) {
    if (isRecoverableWriteError(error)) return;
    throw error;
  }
}

/** Recent forecasts for an asset, newest first. Empty without a DB. */
export async function getForecastHistory(assetId: string, limit = 90): Promise<ForecastHistoryPoint[]> {
  const client = getConfiguredClient();
  if (!client) return [];

  try {
    const rows = await client.query<ForecastHistoryRow>(
      `
        select
          asset_id as "assetId",
          symbol as "symbol",
          horizon as "horizon",
          directional_bias as "directionalBias",
          confidence_score as "confidenceScore",
          reference_price as "referencePrice",
          produced_at as "producedAt"
        from ${forecastsTable}
        where asset_id = $1
        order by produced_at desc
        limit $2
      `,
      [assetId, limit],
    );

    return rows.map((row) => ({
      assetId: row.assetId,
      symbol: row.symbol,
      horizon: row.horizon,
      directionalBias: row.directionalBias,
      confidenceScore: toNumber(row.confidenceScore) ?? 0,
      referencePrice: toNumber(row.referencePrice),
      producedAt: row.producedAt instanceof Date ? row.producedAt.toISOString() : row.producedAt,
    }));
  } catch (error) {
    if (isMissingSchemaError(error)) return [];
    throw error;
  }
}
