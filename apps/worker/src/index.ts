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

  startScheduler();

  console.info('[worker] started', {
    concurrency: env.WORKER_CONCURRENCY,
  });
}

void main();