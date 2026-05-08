import { createHash } from 'node:crypto';
import { createDatabaseClient } from '../client';

type MemoryRecordInput = {
  table:
    | 'app.asset_snapshots'
    | 'app.lane_snapshots'
    | 'app.signal_decision_traces'
    | 'app.broker_decision_traces'
    | 'app.news_impact_traces'
    | 'app.report_artifacts'
    | 'app.intelligence_memory_chunks';
  sourceType: string;
  sourceId: string;
  assetIds?: string[];
  symbols?: string[];
  timeWindowStart?: string | null;
  timeWindowEnd?: string | null;
  metrics?: Record<string, unknown>;
  explanation: string;
  confidence: number;
  versionSeed?: string;
};

function buildVersionHash(input: MemoryRecordInput) {
  const payload = JSON.stringify({
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    assetIds: input.assetIds ?? [],
    symbols: input.symbols ?? [],
    timeWindowStart: input.timeWindowStart ?? null,
    timeWindowEnd: input.timeWindowEnd ?? null,
    metrics: input.metrics ?? {},
    explanation: input.explanation,
    confidence: input.confidence,
    versionSeed: input.versionSeed ?? null,
  });
  return createHash('sha256').update(payload).digest('hex');
}

export async function insertIntelligenceMemoryRecord(input: MemoryRecordInput): Promise<string> {
  const client = createDatabaseClient();
  if (!client.isConfigured) {
    return '';
  }

  const versionHash = buildVersionHash(input);
  const rows = await client.query<{ id: string }>(
    `insert into ${input.table} (
      source_type, source_id, asset_ids, symbols, time_window_start, time_window_end,
      metrics, explanation, confidence, version_hash
    ) values ($1,$2,$3::jsonb,$4::jsonb,$5,$6,$7::jsonb,$8,$9,$10)
    returning id`,
    [
      input.sourceType,
      input.sourceId,
      JSON.stringify(input.assetIds ?? []),
      JSON.stringify(input.symbols ?? []),
      input.timeWindowStart ?? null,
      input.timeWindowEnd ?? null,
      JSON.stringify(input.metrics ?? {}),
      input.explanation,
      input.confidence,
      versionHash,
    ],
  );

  return rows[0]?.id ?? '';
}

export async function pruneIntelligenceMemory(retentionDays = 90): Promise<void> {
  const client = createDatabaseClient();
  if (!client.isConfigured) return;

  const tables = [
    'app.asset_snapshots',
    'app.lane_snapshots',
    'app.signal_decision_traces',
    'app.broker_decision_traces',
    'app.news_impact_traces',
    'app.report_artifacts',
    'app.intelligence_memory_chunks',
  ];

  for (const table of tables) {
    await client.execute(
      `delete from ${table} where created_at < now() - ($1::int * interval '1 day')`,
      [retentionDays],
    );
  }
}
