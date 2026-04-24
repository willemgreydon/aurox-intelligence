import { describe, expect, it } from 'vitest';
import { finishIngestionRun, startIngestionRun, summarizeIngestionBatch } from '../run-lifecycle';

describe('run lifecycle', () => {
  it('starts a run in running state', () => {
    const run = startIngestionRun({ id: 'run-1', source: 'polygon' });
    expect(run.status).toBe('running');
    expect(run.completedAt).toBeNull();
  });

  it('finishes a run once', () => {
    const started = startIngestionRun({ id: 'run-2', source: 'polygon' });
    const finished = finishIngestionRun(started, 'succeeded');

    expect(finished.status).toBe('succeeded');
    expect(finished.completedAt).not.toBeNull();
  });
});

describe('summarizeIngestionBatch', () => {
  it('reports totals and dropped records', () => {
    const summary = summarizeIngestionBatch(
      [
        {
          sourceSymbol: 'AAPL',
          canonicalSymbol: 'AAPL',
          assetKind: 'stock',
          provider: 'polygon',
          observedAt: null,
          price: null,
          change: null,
          changePercent: null,
        },
        {
          sourceSymbol: 'MSFT',
          canonicalSymbol: 'MSFT',
          assetKind: 'stock',
          provider: 'polygon',
          observedAt: '2026-01-02T03:04:05.000Z',
          price: 100,
          change: 1,
          changePercent: 1,
        },
      ],
      [{ sourceSymbol: 'BAD', reason: 'invalid payload' }],
    );

    expect(summary.totalRecords).toBe(3);
    expect(summary.canonicalizedRecords).toBe(2);
    expect(summary.droppedRecords).toBe(1);
    expect(summary.failedRecords).toBe(1);
  });
});

