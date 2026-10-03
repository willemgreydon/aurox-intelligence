// Deepen app.market_daily_bars on DEV with ~2 years of REAL daily OHLCV via the
// configured provider chain, reusing the production fetch→write path
// (fetchMarketHistory + replaceMarketHistoryBars). Idempotent (replace per symbol).
// No fabrication: a symbol that fails all providers is left as-is and reported.
//
// SAFETY: asserts DEV (ep-cold-thunder) on the pooled DATABASE_URL the db client
// uses. Refuses production. No trades.
//
// Run from repo root:
//   node packages/db/scripts/extend-market-history.mjs
import { register } from 'node:module';
register('./_ext-resolver.mjs', import.meta.url);

import nextEnv from '@next/env';
import postgres from 'postgres';
import { fileURLToPath } from 'node:url';

const { loadEnvConfig } = nextEnv;
const repoRoot = fileURLToPath(new URL('../../..', import.meta.url));
loadEnvConfig(repoRoot);

// db client uses DATABASE_URL (pooled); guard that specific one.
const dbUrl = (process.env.DATABASE_URL || '').trim();
const endpoint = dbUrl.replace(/^[a-z]+:\/\/[^@]*@/, '').replace(/[/?].*$/, '').split('.')[0];
if (endpoint.startsWith('ep-sparkling-brook-algv6enr') || !endpoint.startsWith('ep-cold-thunder-b217dces')) {
  console.error(`REFUSING extend: DATABASE_URL endpoint "${endpoint}" is not confirmed DEV.`);
  process.exit(3);
}
console.log(`[guard] DEV endpoint confirmed: ${endpoint}`);

const { fetchMarketHistory, normalizeMarketSymbol } = await import('../../providers/dist/index.js');
const { replaceMarketHistoryBars } = await import('../../db/dist/index.js');

const sql = postgres((process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL).trim(), { max: 1, prepare: false, idle_timeout: 20, connect_timeout: 30 });

function isoDaysAgo(days) {
  const ms = Date.parse('2026-10-02T00:00:00.000Z') - days * 86400000; // anchor "today" deterministically
  return new Date(ms).toISOString().slice(0, 10);
}

async function main() {
  const universe = await sql`select symbol from app.market_assets order by symbol`;
  const symbols = universe.map((u) => u.symbol);
  const from = isoDaysAgo(730);
  const to = isoDaysAgo(0);
  console.log(`[range] ${from} -> ${to} (1d) for ${symbols.length} symbols`);

  const [{ id: runId }] = await sql`
    insert into public.ingestion_runs (source, status, started_at, provider, dataset, asset_scope, requested_range_start, requested_range_end, bar_interval, code_version)
    values ('market-history-extend', 'running', now(), ${process.env.MARKET_DATA_PROVIDER || 'chain'}, 'market_daily_bars', ${sql.json(symbols)}, ${from}, ${to}, '1d', 'extend-history-v1')
    returning id`;

  let totalBars = 0, ok = 0, failed = 0;
  const perSymbol = [];
  for (const symbol of symbols) {
    try {
      const history = await fetchMarketHistory({ symbol, from, to, resolution: '1d' }).catch((e) => { throw e; });
      if (!history || history.length === 0) { perSymbol.push([symbol, 0, 'empty']); failed++; continue; }
      await replaceMarketHistoryBars(symbol, history.map((bar) => ({
        symbol: normalizeMarketSymbol(bar.symbol),
        timestamp: bar.timestamp, open: bar.open, high: bar.high, low: bar.low, close: bar.close,
        volume: bar.volume ?? null, source: bar.source,
      })));
      totalBars += history.length; ok++;
      perSymbol.push([symbol, history.length, history[0]?.source ?? '?']);
    } catch (e) {
      perSymbol.push([symbol, 0, 'ERR:' + String(e?.message || e).slice(0, 60)]);
      failed++;
    }
  }

  await sql`update public.ingestion_runs set status='succeeded', completed_at=now(), rows_received=${totalBars}, rows_inserted=${totalBars} where id=${runId}`;
  console.log('\n=== per symbol (symbol | bars | source) ===');
  perSymbol.forEach(([s, n, src]) => console.log(`  ${String(s).padEnd(18)} ${String(n).padStart(5)}  ${src}`));
  console.log(`\n[done] ok=${ok} failed=${failed} totalBars=${totalBars} runId=${runId}`);
}
main().catch((e) => { console.error('EXTEND_ERROR', e?.stack || String(e)); process.exitCode = 1; })
  .finally(async () => { await sql.end({ timeout: 5 }); });
