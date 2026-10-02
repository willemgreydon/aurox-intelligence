import { env } from './env.js';
import { initializeWorker } from './bootstrap/init.js';
import { startScheduler } from './schedulers/scheduler.js';

async function main() {
  const bootstrap = await initializeWorker();

  console.info('[worker] initialized', {
    nodeEnv: env.NODE_ENV,
    concurrency: env.WORKER_CONCURRENCY,
    logLevel: env.LOG_LEVEL,
    marketDataProvider: env.MARKET_DATA_PROVIDER,
    capabilities: bootstrap?.capabilities ?? [],
  });

  if (!env.WORKER_SCHEDULER_ENABLED) {
    // Scheduler is opt-in (see env.ts). Skipping it keeps a local `pnpm dev`
    // from polling the (often shared/prod) Neon database and burning egress quota.
    console.info(
      '[worker] scheduler disabled — set WORKER_SCHEDULER_ENABLED=true to run background ingestion locally ' +
        '(ideally with a dev-only DATABASE_URL / Neon dev branch)',
    );
    return;
  }

  startScheduler();

  console.info('[worker] started', {
    concurrency: env.WORKER_CONCURRENCY,
  });
}

void main();