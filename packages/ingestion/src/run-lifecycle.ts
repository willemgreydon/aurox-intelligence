import type { IngestionRun } from '@repo/api-contracts';
import type { IngestionBatchSummary, IngestionError, IngestionRecord } from './types';

export function startIngestionRun(input: {
  id: string;
  source: string;
  startedAt?: string;
}): IngestionRun {
  return {
    id: input.id,
    source: input.source,
    status: 'running',
    startedAt: input.startedAt ?? new Date().toISOString(),
    completedAt: null,
  };
}

export function finishIngestionRun(
  run: IngestionRun,
  status: 'succeeded' | 'failed',
  completedAt?: string,
): IngestionRun {
  if (run.status === 'succeeded' || run.status === 'failed') {
    return run;
  }
  return {
    ...run,
    status,
    completedAt: completedAt ?? new Date().toISOString(),
  };
}

export function summarizeIngestionBatch(
  records: readonly IngestionRecord[],
  errors: readonly IngestionError[],
): IngestionBatchSummary {
  const droppedRecords = records.filter((record) => record.price === null).length;
  return {
    totalRecords: records.length + errors.length,
    canonicalizedRecords: records.length,
    droppedRecords,
    failedRecords: errors.length,
  };
}

