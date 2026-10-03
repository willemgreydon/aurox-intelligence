import { createDatabaseClient, type DatabaseClient } from '../client';
import {
  forecastEvaluationsTable,
  signalOutcomesTable,
} from '../schema/intelligence-evaluation';
import { signalHistoryTable } from '../schema/signal-history';
import { forecastsTable } from '../schema/forecasts';

/**
 * Query/write helpers for the incremental evidence-recompute lifecycle:
 *
 *   market_data → signal → forecast → [horizon passes] → outcome/evaluation
 *
 * All writes are idempotent via ON CONFLICT DO NOTHING on the unique constraints
 * created in migration 0027 (signal_history) and existing constraints in 0025
 * (signal_outcomes, forecast_evaluations).
 *
 * Follows repo convention: stub client → empty/no-op; missing schema degrades
 * gracefully (tables may not exist on a fresh DB before migration).
 */

function isMissingSchemaError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('code' in error)) return false;
  const code = (error as { code?: string }).code;
  // 42P01 = undefined_table, 42703 = undefined_column, 23503 = FK violation
  return code === '42P01' || code === '42703' || code === '23503';
}

function getConfiguredClient(): DatabaseClient | null {
  const client = createDatabaseClient();
  return client.isConfigured ? client : null;
}

function toNumber(value: string | number | null | undefined): number | null {
  if (value == null) return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface SignalAwaitingForecast {
  id: string;
  assetId: string;
  symbol: string;
  assetClass: string | null;
  interpretation: 'bullish' | 'bearish' | 'neutral';
  compositeScore: number;
  confidence: number;
  latestPrice: number | null;
  generatedAt: string;
  generatedDate: string;
}

export interface SignalAwaitingEvaluation {
  id: string;
  assetId: string;
  symbol: string;
  interpretation: 'bullish' | 'bearish' | 'neutral';
  compositeScore: number;
  confidence: number;
  latestPrice: number | null;
  generatedAt: string;
}

export interface ForecastAwaitingEvaluation {
  id: string;
  assetId: string;
  symbol: string | null;
  horizon: string;
  directionalBias: 'bullish' | 'bearish' | 'neutral';
  confidenceScore: number;
  referencePrice: number | null;
  generatedAt: string;
}

export interface MarketBarForEvaluation {
  observedOn: string;
  close: number;
}

export interface SignalOutcomeRecord {
  signalId: string;
  assetId: string;
  symbol: string;
  signalGeneratedAt: string;
  horizonDays: number;
  evaluatedAt: string;
  entryPrice: number;
  exitPrice: number;
  forwardReturn: number;
  mfe: number | null;
  mae: number | null;
  predictedDirection: 'bullish' | 'bearish' | 'neutral';
  realizedDirection: 'bullish' | 'bearish' | 'neutral';
  directionCorrect: boolean;
  signalScore: number;
  signalConfidence: number;
  methodVersion: string;
}

export interface ForecastEvaluationRecord {
  forecastId: string;
  assetId: string;
  symbol: string | null;
  producedAt: string;
  horizon: string;
  horizonDays: number;
  evaluatedAt: string;
  referencePrice: number;
  realizedPrice: number;
  forwardReturn: number;
  directionalBias: 'bullish' | 'bearish' | 'neutral';
  realizedDirection: 'bullish' | 'bearish' | 'neutral';
  directionCorrect: boolean;
  brierScore: number | null;
  scenarioWeights: { bullish: number; base: number; bearish: number };
  confidenceScore: number;
  methodVersion: string;
}

// ── Queries ──────────────────────────────────────────────────────────────────

/** Signals that have no matching forecast in the forecasts table. */
export async function getSignalsAwaitingForecast(limit = 50): Promise<SignalAwaitingForecast[]> {
  const client = getConfiguredClient();
  if (!client) return [];
  try {
    const rows = await client.query<{
      id: string;
      assetId: string;
      symbol: string;
      assetClass: string | null;
      interpretation: string;
      compositeScore: string | number;
      confidence: string | number;
      latestPrice: string | number | null;
      generatedAt: string | Date;
      generatedDate: string;
    }>(
      `
        select
          sh.id,
          sh.asset_id     as "assetId",
          sh.symbol,
          sh.asset_class  as "assetClass",
          sh.interpretation,
          sh.composite_score as "compositeScore",
          sh.confidence,
          sh.latest_price as "latestPrice",
          sh.generated_at as "generatedAt",
          sh.generated_date::text as "generatedDate"
        from ${signalHistoryTable} sh
        where not exists (
          select 1 from ${forecastsTable} f
          where f.asset_id = sh.asset_id
            and f.generated_date = sh.generated_date
        )
        order by sh.generated_at
        limit $1
      `,
      [limit],
    );
    return rows.map((row) => ({
      id: row.id,
      assetId: row.assetId,
      symbol: row.symbol,
      assetClass: row.assetClass,
      interpretation: (row.interpretation === 'bullish' || row.interpretation === 'bearish'
        ? row.interpretation
        : 'neutral') as 'bullish' | 'bearish' | 'neutral',
      compositeScore: toNumber(row.compositeScore) ?? 0,
      confidence: toNumber(row.confidence) ?? 0,
      latestPrice: toNumber(row.latestPrice),
      generatedAt:
        row.generatedAt instanceof Date ? row.generatedAt.toISOString() : String(row.generatedAt),
      generatedDate: row.generatedDate,
    }));
  } catch (error) {
    if (isMissingSchemaError(error)) return [];
    throw error;
  }
}

/** Signals whose horizon has matured but that have no signal_outcome yet. */
export async function getSignalsAwaitingEvaluation(
  horizonDays = 10,
  limit = 100,
): Promise<SignalAwaitingEvaluation[]> {
  const client = getConfiguredClient();
  if (!client) return [];
  try {
    const rows = await client.query<{
      id: string;
      assetId: string;
      symbol: string;
      interpretation: string;
      compositeScore: string | number;
      confidence: string | number;
      latestPrice: string | number | null;
      generatedAt: string | Date;
    }>(
      `
        select
          sh.id,
          sh.asset_id     as "assetId",
          sh.symbol,
          sh.interpretation,
          sh.composite_score as "compositeScore",
          sh.confidence,
          sh.latest_price as "latestPrice",
          sh.generated_at as "generatedAt"
        from ${signalHistoryTable} sh
        where sh.latest_price is not null
          and sh.generated_at <= now() - ($1 || ' days')::interval
          and not exists (
            select 1 from ${signalOutcomesTable} so
            where so.signal_id = sh.id
              and so.horizon_days = $1
          )
        order by sh.generated_at
        limit $2
      `,
      [horizonDays, limit],
    );
    return rows.map((row) => ({
      id: row.id,
      assetId: row.assetId,
      symbol: row.symbol,
      interpretation: (row.interpretation === 'bullish' || row.interpretation === 'bearish'
        ? row.interpretation
        : 'neutral') as 'bullish' | 'bearish' | 'neutral',
      compositeScore: toNumber(row.compositeScore) ?? 0,
      confidence: toNumber(row.confidence) ?? 0,
      latestPrice: toNumber(row.latestPrice),
      generatedAt:
        row.generatedAt instanceof Date ? row.generatedAt.toISOString() : String(row.generatedAt),
    }));
  } catch (error) {
    if (isMissingSchemaError(error)) return [];
    throw error;
  }
}

/** Forecasts whose horizon has matured but that have no forecast_evaluation yet. */
export async function getForecastsAwaitingEvaluation(
  horizonDays = 10,
  limit = 100,
): Promise<ForecastAwaitingEvaluation[]> {
  const client = getConfiguredClient();
  if (!client) return [];
  try {
    const rows = await client.query<{
      id: string;
      assetId: string;
      symbol: string | null;
      horizon: string;
      directionalBias: string;
      confidenceScore: string | number;
      referencePrice: string | number | null;
      generatedAt: string | Date;
    }>(
      `
        select
          f.id,
          f.asset_id        as "assetId",
          f.symbol,
          f.horizon,
          f.directional_bias as "directionalBias",
          f.confidence_score as "confidenceScore",
          f.reference_price  as "referencePrice",
          f.generated_at     as "generatedAt"
        from ${forecastsTable} f
        where f.generated_at is not null
          and f.reference_price is not null
          and f.generated_at <= now() - ($1 || ' days')::interval
          and not exists (
            select 1 from ${forecastEvaluationsTable} fe
            where fe.forecast_id = f.id
              and fe.horizon_days = $1
          )
        order by f.generated_at
        limit $2
      `,
      [horizonDays, limit],
    );
    return rows.map((row) => ({
      id: row.id,
      assetId: row.assetId,
      symbol: row.symbol,
      horizon: row.horizon,
      directionalBias: (row.directionalBias === 'bullish' || row.directionalBias === 'bearish'
        ? row.directionalBias
        : 'neutral') as 'bullish' | 'bearish' | 'neutral',
      confidenceScore: toNumber(row.confidenceScore) ?? 0,
      referencePrice: toNumber(row.referencePrice),
      generatedAt:
        row.generatedAt instanceof Date ? row.generatedAt.toISOString() : String(row.generatedAt),
    }));
  } catch (error) {
    if (isMissingSchemaError(error)) return [];
    throw error;
  }
}

/** Daily bars for a symbol in [fromDateIso, toDateIso] inclusive. */
export async function getBarsForEvaluation(
  symbol: string,
  fromDateIso: string,
  toDateIso: string,
): Promise<MarketBarForEvaluation[]> {
  const client = getConfiguredClient();
  if (!client) return [];
  try {
    const rows = await client.query<{ observedOn: string | Date; close: string | number }>(
      `
        select
          observed_on as "observedOn",
          close
        from app.market_daily_bars
        where symbol = $1
          and observed_on >= $2::date
          and observed_on <= $3::date
        order by observed_on
      `,
      [symbol, fromDateIso, toDateIso],
    );
    return rows
      .map((row) => ({
        observedOn:
          row.observedOn instanceof Date
            ? row.observedOn.toISOString().substring(0, 10)
            : String(row.observedOn).substring(0, 10),
        close: toNumber(row.close) ?? 0,
      }))
      .filter((row) => row.close > 0);
  } catch (error) {
    if (isMissingSchemaError(error)) return [];
    throw error;
  }
}

// ── Writes ───────────────────────────────────────────────────────────────────

/** Insert a signal outcome. Silently skips if (signal_id, horizon_days) already exists. */
export async function recordSignalOutcome(outcome: SignalOutcomeRecord): Promise<void> {
  const client = getConfiguredClient();
  if (!client) return;
  try {
    await client.execute(
      `
        insert into ${signalOutcomesTable} (
          signal_id, asset_id, symbol, signal_generated_at, horizon_days,
          evaluated_at, entry_price, exit_price, forward_return,
          mfe, mae, predicted_direction, realized_direction, direction_correct,
          signal_score, signal_confidence, method_version
        ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        on conflict (signal_id, horizon_days) do nothing
      `,
      [
        outcome.signalId,
        outcome.assetId,
        outcome.symbol,
        outcome.signalGeneratedAt,
        outcome.horizonDays,
        outcome.evaluatedAt,
        outcome.entryPrice,
        outcome.exitPrice,
        outcome.forwardReturn,
        outcome.mfe ?? null,
        outcome.mae ?? null,
        outcome.predictedDirection,
        outcome.realizedDirection,
        outcome.directionCorrect,
        outcome.signalScore,
        outcome.signalConfidence,
        outcome.methodVersion,
      ],
    );
  } catch (error) {
    if (isMissingSchemaError(error)) return;
    throw error;
  }
}

/** Insert a forecast evaluation. Silently skips if (forecast_id, horizon_days) already exists. */
export async function recordForecastEvaluation(evaluation: ForecastEvaluationRecord): Promise<void> {
  const client = getConfiguredClient();
  if (!client) return;
  try {
    await client.execute(
      `
        insert into ${forecastEvaluationsTable} (
          forecast_id, asset_id, symbol, produced_at, horizon, horizon_days,
          evaluated_at, reference_price, realized_price, forward_return,
          directional_bias, realized_direction, direction_correct,
          brier_score, scenario_weights, confidence_score, status, method_version
        ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        on conflict (forecast_id, horizon_days) do nothing
      `,
      [
        evaluation.forecastId,
        evaluation.assetId,
        evaluation.symbol ?? null,
        evaluation.producedAt,
        evaluation.horizon,
        evaluation.horizonDays,
        evaluation.evaluatedAt,
        evaluation.referencePrice,
        evaluation.realizedPrice,
        evaluation.forwardReturn,
        evaluation.directionalBias,
        evaluation.realizedDirection,
        evaluation.directionCorrect,
        evaluation.brierScore ?? null,
        JSON.stringify(evaluation.scenarioWeights),
        evaluation.confidenceScore,
        'evaluated',
        evaluation.methodVersion,
      ],
    );
  } catch (error) {
    if (isMissingSchemaError(error)) return;
    throw error;
  }
}
