// DEV-ONLY reset of backfill-generated evidence rows so the chain can be
// regenerated coherently on the deepened history. Host-guarded; refuses PROD.
// These rows are backfill artifacts (tables were empty before the backfill).
import nextEnv from '@next/env';
import postgres from 'postgres';
import { fileURLToPath } from 'node:url';
const { loadEnvConfig } = nextEnv;
loadEnvConfig(fileURLToPath(new URL('../../..', import.meta.url)));
const url = (process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || '').trim();
const ep = url.replace(/^[a-z]+:\/\/[^@]*@/, '').replace(/[/?].*$/, '').split('.')[0];
if (ep.startsWith('ep-sparkling-brook-algv6enr') || !ep.startsWith('ep-cold-thunder-b217dces')) {
  console.error(`REFUSING reset: endpoint "${ep}" is not confirmed DEV.`); process.exit(3);
}
const sql = postgres(url, { max: 1, prepare: false, idle_timeout: 10, connect_timeout: 20 });
try {
  await sql`delete from app.signal_outcomes`;
  await sql`delete from app.forecast_evaluations`;
  await sql`delete from public.forecasts where ingestion_run_id is not null or symbol is not null`;
  await sql`delete from public.signal_history`;
  console.log(`[reset] DEV evidence tables cleared on ${ep}`);
} finally { await sql.end({ timeout: 5 }); }
