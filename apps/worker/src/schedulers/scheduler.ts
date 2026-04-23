import { ingestMacroDataJob } from '../jobs/ingest-macro-data.js';
import { ingestMarketDataJob } from '../jobs/ingest-market-data.js';
import { extractMarketIntelligenceJob } from '../jobs/extract-market-intelligence.js';
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

export function startScheduler() {
  console.info('[worker] scheduler initialized', {
    jobs: scheduledJobs.map((job) => ({
      name: job.name,
      intervalMs: job.intervalMs,
    })),
  });

  for (const job of scheduledJobs) {
    void runJob(job.name, job.execute);

    setInterval(() => {
      void runJob(job.name, job.execute);
    }, job.intervalMs);
  }
}