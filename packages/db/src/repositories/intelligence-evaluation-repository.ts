import type { CalibrationBucket } from '@repo/api-contracts';
import { createDatabaseClient, type DatabaseClient } from '../client';
import {
  forecastCalibrationView,
  forecastEvaluationsTable,
  signalCalibrationView,
  signalOutcomesTable,
} from '../schema/intelligence-evaluation';

/**
 * Read models for the evidence-chain evaluation layer (signal/forecast outcomes
 * and confidence calibration). Writes are performed by the deterministic
 * backfill / recompute path, not here. Follows the repo convention: stub client
 * → empty result; a not-yet-migrated schema degrades gracefully.
 */

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

function toDirection(value: string): 'bullish' | 'bearish' | 'neutral' {
  return value === 'bullish' || value === 'bearish' ? value : 'neutral';
}

type CalibrationRow = {
  confidenceBucket: string | number;
  direction: string;
  sampleSize: string | number;
  hitRate: string | number;
  avgForwardReturn: string | number | null;
  avgConfidence: string | number | null;
  avgBrier: string | number | null;
};

function mapCalibration(rows: CalibrationRow[]): CalibrationBucket[] {
  return rows.map((row) => ({
    confidenceBucket: toNumber(row.confidenceBucket) ?? 0,
    direction: toDirection(row.direction),
    sampleSize: toNumber(row.sampleSize) ?? 0,
    hitRate: toNumber(row.hitRate) ?? 0,
    avgForwardReturn: toNumber(row.avgForwardReturn) ?? 0,
    avgConfidence: toNumber(row.avgConfidence),
    avgBrier: toNumber(row.avgBrier),
  }));
}

/** Signal confidence calibration: hit rate by confidence bucket × direction. */
export async function getSignalCalibration(): Promise<CalibrationBucket[]> {
  const client = getConfiguredClient();
  if (!client) return [];
  try {
    const rows = await client.query<CalibrationRow>(
      `
        select
          confidence_bucket as "confidenceBucket",
          predicted_direction as "direction",
          sample_size as "sampleSize",
          hit_rate as "hitRate",
          avg_forward_return as "avgForwardReturn",
          avg_confidence as "avgConfidence",
          null as "avgBrier"
        from ${signalCalibrationView}
        order by predicted_direction, confidence_bucket
      `,
    );
    return mapCalibration(rows);
  } catch (error) {
    if (isMissingSchemaError(error)) return [];
    throw error;
  }
}

/** Forecast confidence calibration: hit rate + Brier by bucket × direction. */
export async function getForecastCalibration(): Promise<CalibrationBucket[]> {
  const client = getConfiguredClient();
  if (!client) return [];
  try {
    const rows = await client.query<CalibrationRow>(
      `
        select
          confidence_bucket as "confidenceBucket",
          directional_bias as "direction",
          sample_size as "sampleSize",
          hit_rate as "hitRate",
          avg_forward_return as "avgForwardReturn",
          avg_confidence as "avgConfidence",
          avg_brier as "avgBrier"
        from ${forecastCalibrationView}
        order by directional_bias, confidence_bucket
      `,
    );
    return mapCalibration(rows);
  } catch (error) {
    if (isMissingSchemaError(error)) return [];
    throw error;
  }
}

export interface EvaluationCoverage {
  signalOutcomes: number;
  signalHitRate: number | null;
  forecastEvaluations: number;
  forecastHitRate: number | null;
  avgBrier: number | null;
}

type CoverageRow = {
  signalOutcomes: string | number;
  signalHitRate: string | number | null;
  forecastEvaluations: string | number;
  forecastHitRate: string | number | null;
  avgBrier: string | number | null;
};

/** Headline evaluation coverage for observability surfaces. */
export async function getEvaluationCoverage(): Promise<EvaluationCoverage> {
  const empty: EvaluationCoverage = {
    signalOutcomes: 0,
    signalHitRate: null,
    forecastEvaluations: 0,
    forecastHitRate: null,
    avgBrier: null,
  };
  const client = getConfiguredClient();
  if (!client) return empty;
  try {
    const [row] = await client.query<CoverageRow>(
      `
        select
          (select count(*) from ${signalOutcomesTable})::int as "signalOutcomes",
          (select avg(case when direction_correct then 1.0 else 0.0 end) from ${signalOutcomesTable})::float8 as "signalHitRate",
          (select count(*) from ${forecastEvaluationsTable})::int as "forecastEvaluations",
          (select avg(case when direction_correct then 1.0 else 0.0 end) from ${forecastEvaluationsTable})::float8 as "forecastHitRate",
          (select avg(brier_score) from ${forecastEvaluationsTable})::float8 as "avgBrier"
      `,
    );
    if (!row) return empty;
    return {
      signalOutcomes: toNumber(row.signalOutcomes) ?? 0,
      signalHitRate: toNumber(row.signalHitRate),
      forecastEvaluations: toNumber(row.forecastEvaluations) ?? 0,
      forecastHitRate: toNumber(row.forecastHitRate),
      avgBrier: toNumber(row.avgBrier),
    };
  } catch (error) {
    if (isMissingSchemaError(error)) return empty;
    throw error;
  }
}
