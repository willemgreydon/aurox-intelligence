import { ingestMacroDataJob } from '../jobs/ingest-macro-data.js';
import { ingestMarketDataJob } from '../jobs/ingest-market-data.js';
import { extractMarketIntelligenceJob } from '../jobs/extract-market-intelligence.js';
import { extractNewsIntelligenceJob } from '../jobs/extract-news-intelligence.js';
import { ingestIntradayMarketDataJob } from '../jobs/ingest-intraday-market-data.js';
import { recomputeForecastsJob } from '../jobs/recompute-forecasts.js';
import { recomputeSignalsJob } from '../jobs/recompute-signals.js';
import { runJob } from '../runners/run-job.js';

type ScheduledJob = {
  name: string;
  intervalMs: number;
  execute: () => Promise<unknown>;
};

const scheduledJobs: ScheduledJob[] = [
  {
    name: 'ingest-market-data',
    intervalMs: 5 * 60 * 1000,
    execute: ingestMarketDataJob,
  },
  {
    name: 'extract-market-intelligence',
    intervalMs: 10 * 60 * 1000,
    execute: extractMarketIntelligenceJob,
  },
  {
    name: 'extract-news-intelligence',
    intervalMs: 12 * 60 * 1000,
    execute: extractNewsIntelligenceJob,
  },
  {
    name: 'ingest-intraday-market-data',
    intervalMs: 7 * 60 * 1000,
    execute: ingestIntradayMarketDataJob,
  },
  {
    name: 'recompute-signals',
    intervalMs: 15 * 60 * 1000,
    execute: recomputeSignalsJob,
  },
  {
    name: 'recompute-forecasts',
    intervalMs: 20 * 60 * 1000,
    execute: recomputeForecastsJob,
  },
  {
    name: 'ingest-macro-data',
    intervalMs: 30 * 60 * 1000,
    execute: ingestMacroDataJob,
  },
];

// Delay before the first job runs, giving the web app a clean window to serve
// pages on startup before ingestion begins competing for the database.
const INITIAL_DELAY_MS = Number(process.env.WORKER_INITIAL_DELAY_MS ?? 20_000);
// Gap between each job's first run so boot doesn't fire all jobs at once. The
// previous implementation kicked every job synchronously on startup, producing
// a thundering-herd of heavy ingestion writes to market_daily_bars that
// starved concurrent page reads (multi-second DB read timeouts on the home
// page). Staggering keeps at most one heavy job starting at a time.
const STARTUP_STAGGER_MS = Number(process.env.WORKER_STARTUP_STAGGER_MS ?? 15_000);

export function startScheduler() {
  console.info('[worker] scheduler initialized', {
    jobs: scheduledJobs.map((job) => ({
      name: job.name,
      intervalMs: job.intervalMs,
    })),
    initialDelayMs: INITIAL_DELAY_MS,
    startupStaggerMs: STARTUP_STAGGER_MS,
  });

  scheduledJobs.forEach((job, index) => {
    const firstRunDelay = INITIAL_DELAY_MS + index * STARTUP_STAGGER_MS;

    setTimeout(() => {
      void runJob(job.name, job.execute);

      setInterval(() => {
        void runJob(job.name, job.execute);
      }, job.intervalMs);
    }, firstRunDelay);
  });
}
