// Backfill the Aurox evidence chain on DEV from REAL market history already in
// app.market_daily_bars. For each curated asset it walks forward session-by-session
// (weekly cadence), generating a POINT-IN-TIME signal from ONLY past+current closes,
// a forecast from that signal, and — once the horizon matures — an evaluated outcome
// (forward return, direction correctness, MFE/MAE) and forecast evaluation (Brier).
//
// Uses the REAL compiled @repo/signals + @repo/forecasting engines (never a reimpl).
// Fully idempotent: signals/forecasts are skipped if already present for
// (asset_id, generated_at); outcomes/evaluations rely on their unique constraints.
//
// SAFETY: hard-asserts the DEV endpoint (ep-cold-thunder) before any write and
// refuses the production endpoint outright. No provider calls, no live trades.
//
// Run from repo root:
//   node packages/db/scripts/backfill-intelligence-evidence.mjs
import { register } from 'node:module';
register('./_ext-resolver.mjs', import.meta.url);

import nextEnv from '@next/env';
import postgres from 'postgres';
import { fileURLToPath } from 'node:url';

const { loadEnvConfig } = nextEnv;
const repoRoot = fileURLToPath(new URL('../../..', import.meta.url));
loadEnvConfig(repoRoot);

// ---- DEV host guard -------------------------------------------------------
const url = (process.env.DATABASE_URL_UNPOOLED || process.env.DIRECT_URL || process.env.DATABASE_URL || '').trim();
const endpoint = url.replace(/^[a-z]+:\/\/[^@]*@/, '').replace(/[/?].*$/, '').split('.')[0];
const DEV_PREFIX = 'ep-cold-thunder-b217dces';
const PROD_PREFIX = 'ep-sparkling-brook-algv6enr';
if (endpoint.startsWith(PROD_PREFIX) || !endpoint.startsWith(DEV_PREFIX)) {
  console.error(`REFUSING backfill: endpoint "${endpoint}" is not the confirmed DEV endpoint.`);
  process.exit(3);
}
console.log(`[guard] DEV endpoint confirmed: ${endpoint}`);

// ---- real compiled engines (dynamic import AFTER hook registration) -------
const { deriveSignalSnapshot } = await import('../../signals/dist/index.js');
const { buildForecastFromSignal } = await import('../../forecasting/dist/index.js');

// ---- config ---------------------------------------------------------------
const HORIZON_DAYS = 10;      // trading sessions forward
const WALK_STEP = 5;          // weekly cadence → lower autocorrelation, bounded rows
const MIN_BARS = 30;          // minimum history before first signal
const DEADBAND = 0.0005;      // ±0.05% neutral band for realized direction
const METHOD = 'walkforward-v1';
const CODE_VERSION = 'evidence-backfill-0025';

const sql = postgres(url, { max: 1, prepare: false, idle_timeout: 20, connect_timeout: 30 });

function realizedDirection(r) {
  return r > DEADBAND ? 'bullish' : r < -DEADBAND ? 'bearish' : 'neutral';
}
// Brier across {bullish, base(=neutral), bearish} one-hot realized outcome.
function brier(weights, realized) {
  const outcome = { bullish: 0, base: 0, bearish: 0 };
  outcome[realized === 'neutral' ? 'base' : realized] = 1;
  return (weights.bullish - outcome.bullish) ** 2 + (weights.base - outcome.base) ** 2 + (weights.bearish - outcome.bearish) ** 2;
}

async function main() {
  const startedAt = new Date().toISOString();
  const universe = await sql`
    select asset_id, symbol, asset_class from app.market_assets order by asset_class, symbol`;
  console.log(`[universe] ${universe.length} curated assets`);

  // Seed public.assets so forecasts FK (asset_id -> assets.id) is satisfied.
  for (const a of universe) {
    await sql`
      insert into public.assets (id, symbol, name, asset_class)
      values (${a.asset_id}, ${a.symbol}, ${a.symbol}, ${a.asset_class})
      on conflict (id) do nothing`;
  }

  // Seed canonical instrument master + provider map (additive canonical identity).
  for (const a of universe) {
    const [{ instrument_id } = {}] = await sql`
      insert into app.instruments (canonical_symbol, display_name, asset_class, provenance)
      values (${a.symbol}, ${a.symbol}, ${a.asset_class}, ${sql.json({ seededFrom: 'market_assets', assetId: a.asset_id })})
      on conflict (canonical_symbol) do update set last_seen_at = now()
      returning instrument_id`;
    if (instrument_id) {
      const provider = a.symbol.startsWith('BINANCE:') ? 'binance' : (process.env.MARKET_DATA_PROVIDER || 'finnhub');
      await sql`
        insert into app.instrument_provider_map (instrument_id, provider, provider_symbol)
        values (${instrument_id}, ${provider}, ${a.symbol})
        on conflict (provider, provider_symbol) do nothing`;
    }
  }

  // Open an auditable ingestion run for this backfill.
  const [{ id: runId }] = await sql`
    insert into public.ingestion_runs
      (source, status, started_at, provider, dataset, asset_scope, bar_interval, code_version)
    values ('evidence-backfill', 'running', ${startedAt}, 'internal-derived', 'signal_forecast_evidence',
            ${sql.json(universe.map((u) => u.symbol))}, '1d', ${CODE_VERSION})
    returning id`;
  console.log(`[run] ingestion_run ${runId}`);

  const totals = { signals: 0, signalsSkipped: 0, forecasts: 0, forecastsSkipped: 0, outcomes: 0, forecastEvals: 0, assetsProcessed: 0 };

  for (const asset of universe) {
    const bars = await sql`
      select observed_on, close from app.market_daily_bars
      where symbol = ${asset.symbol} order by observed_on asc`;
    if (bars.length < MIN_BARS + HORIZON_DAYS) {
      console.log(`[skip] ${asset.symbol}: only ${bars.length} bars`);
      continue;
    }
    const closes = bars.map((b) => Number(b.close));
    const dates = bars.map((b) => new Date(b.observed_on).toISOString());

    // preload existing to stay idempotent without touching table constraints
    const existingSignals = new Map(
      (await sql`select id, generated_at from public.signal_history where asset_id = ${asset.asset_id}`)
        .map((r) => [new Date(r.generated_at).toISOString(), r.id]));
    const existingForecasts = new Map(
      (await sql`select id, produced_at from public.forecasts where asset_id = ${asset.asset_id}`)
        .map((r) => [new Date(r.produced_at).toISOString(), r.id]));

    for (let t = MIN_BARS; t < closes.length; t += WALK_STEP) {
      const closesUpToT = closes.slice(0, t + 1); // POINT-IN-TIME: no look-ahead
      const genIso = dates[t];
      const entry = closes[t];
      if (!Number.isFinite(entry) || entry <= 0) continue;

      const signal = deriveSignalSnapshot(asset.asset_id, closesUpToT);

      // --- signal_history (idempotent) ---
      let signalId = existingSignals.get(genIso);
      if (!signalId) {
        const [row] = await sql`
          insert into public.signal_history
            (asset_id, symbol, asset_class, interpretation, composite_score, confidence, latest_price, generated_at, ingestion_run_id)
          values (${asset.asset_id}, ${asset.symbol}, ${asset.asset_class}, ${signal.interpretation},
                  ${signal.compositeScoreValue}, ${signal.confidenceScore}, ${entry}, ${genIso}, ${runId})
          returning id`;
        signalId = row.id;
        existingSignals.set(genIso, signalId);
        totals.signals++;
      } else {
        totals.signalsSkipped++;
      }

      // --- forecasts (idempotent) ---
      const forecast = buildForecastFromSignal(signal, genIso);
      let forecastId = existingForecasts.get(genIso);
      if (!forecastId) {
        const [row] = await sql`
          insert into public.forecasts
            (asset_id, symbol, horizon, directional_bias, confidence_score, scenario_summary, reference_price, produced_at, generated_at, ingestion_run_id)
          values (${asset.asset_id}, ${asset.symbol}, ${forecast.horizon}, ${forecast.directionalBias},
                  ${forecast.confidenceScore}, ${forecast.scenarioSummary}, ${entry}, ${genIso}, ${genIso}, ${runId})
          returning id`;
        forecastId = row.id;
        existingForecasts.set(genIso, forecastId);
        totals.forecasts++;
      } else {
        totals.forecastsSkipped++;
      }

      // --- evaluation (only when horizon has matured within real data) ---
      if (t + HORIZON_DAYS < closes.length) {
        const exit = closes[t + HORIZON_DAYS];
        const window = closes.slice(t + 1, t + HORIZON_DAYS + 1);
        const fwd = (exit - entry) / entry;
        const mfe = (Math.max(...window) - entry) / entry;
        const mae = (Math.min(...window) - entry) / entry;
        const realized = realizedDirection(fwd);
        const evaluatedAt = dates[t + HORIZON_DAYS];

        const sigCorrect = signal.interpretation === realized;
        const so = await sql`
          insert into app.signal_outcomes
            (signal_id, asset_id, symbol, signal_generated_at, horizon_days, evaluated_at, entry_price, exit_price,
             forward_return, mfe, mae, predicted_direction, realized_direction, direction_correct,
             signal_score, signal_confidence, method_version, ingestion_run_id)
          values (${signalId}, ${asset.asset_id}, ${asset.symbol}, ${genIso}, ${HORIZON_DAYS}, ${evaluatedAt}, ${entry}, ${exit},
                  ${fwd}, ${mfe}, ${mae}, ${signal.interpretation}, ${realized}, ${sigCorrect},
                  ${signal.compositeScoreValue}, ${signal.confidenceScore}, ${METHOD}, ${runId})
          on conflict (signal_id, horizon_days) do nothing
          returning id`;
        if (so.length) totals.outcomes++;

        const fbias = forecast.directionalBias;
        const fe = await sql`
          insert into app.forecast_evaluations
            (forecast_id, asset_id, symbol, produced_at, horizon, horizon_days, evaluated_at, reference_price, realized_price,
             forward_return, directional_bias, realized_direction, direction_correct, brier_score, scenario_weights,
             confidence_score, status, method_version, ingestion_run_id)
          values (${forecastId}, ${asset.asset_id}, ${asset.symbol}, ${genIso}, ${forecast.horizon}, ${HORIZON_DAYS}, ${evaluatedAt}, ${entry}, ${exit},
                  ${fwd}, ${fbias}, ${realized}, ${fbias === realized}, ${brier(forecast.scenarioWeights, realized)},
                  ${sql.json(forecast.scenarioWeights)}, ${forecast.confidenceScore}, 'evaluated', ${METHOD}, ${runId})
          on conflict (forecast_id, horizon_days) do nothing
          returning id`;
        if (fe.length) totals.forecastEvals++;
      }
    }
    totals.assetsProcessed++;
    process.stdout.write(`[asset] ${asset.symbol.padEnd(18)} done\n`);
  }

  await sql`
    update public.ingestion_runs set status = 'succeeded', completed_at = now(),
      rows_inserted = ${totals.signals + totals.forecasts + totals.outcomes + totals.forecastEvals},
      rows_updated = 0,
      duplicates = ${totals.signalsSkipped + totals.forecastsSkipped},
      asset_scope = ${sql.json({ assetsProcessed: totals.assetsProcessed })}
    where id = ${runId}`;

  console.log('\n=== backfill totals ===');
  console.log(JSON.stringify({ runId, ...totals }, null, 2));
}

main()
  .catch((e) => { console.error('BACKFILL_ERROR', e?.stack || String(e)); process.exitCode = 1; })
  .finally(async () => { await sql.end({ timeout: 5 }); });
