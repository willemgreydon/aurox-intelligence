import { createHash } from 'node:crypto';
import { createDatabaseClient } from '../client';

type ObservationSeverity = 'INFO' | 'WATCH' | 'WARNING' | 'CRITICAL';
type ObservationSource = 'signal' | 'news' | 'risk' | 'provider' | 'portfolio' | 'anomaly' | 'broker' | 'simulation' | 'regime';

export type ObservationEventInput = {
  workspaceId?: string | null;
  userId?: string | null;
  assetId?: string | null;
  symbol?: string | null;
  assetClass?: string | null;
  source: ObservationSource;
  eventType: string;
  severity: ObservationSeverity;
  title: string;
  description: string;
  confidence?: number | null;
  score?: number | null;
  relatedSignalId?: string | null;
  relatedNewsId?: string | null;
  relatedRiskId?: string | null;
  relatedDecisionId?: string | null;
  relatedOrderId?: string | null;
  metadata?: Record<string, unknown>;
  observedAt: string;
};

export type ObservationEventRecord = ObservationEventInput & {
  id: string;
  fingerprint: string;
  createdAt: string;
  read: boolean;
  pinned: boolean;
  dismissed: boolean;
};

export type ObservationEventFilters = {
  userId?: string | null;
  source?: string | null;
  severity?: string | null;
  symbol?: string | null;
  limit?: number;
};

type ObservationEventRow = {
  id: string;
  workspaceId: string | null;
  userId: string | null;
  assetId: string | null;
  symbol: string | null;
  assetClass: string | null;
  source: ObservationSource;
  eventType: string;
  severity: ObservationSeverity;
  title: string;
  description: string;
  confidence: number | null;
  score: number | null;
  relatedSignalId: string | null;
  relatedNewsId: string | null;
  relatedRiskId: string | null;
  relatedDecisionId: string | null;
  relatedOrderId: string | null;
  metadata: Record<string, unknown>;
  fingerprint: string;
  observedAt: string;
  createdAt: string;
  read: boolean;
  pinned: boolean;
  dismissed: boolean;
};

function isMissingTable(error: unknown) {
  if (typeof error !== 'object' || error === null || !('code' in error)) return false;
  const e = error as { code?: string };
  return e.code === '42P01' || e.code === '42703';
}

function buildFingerprint(event: ObservationEventInput): string {
  const payload = JSON.stringify({
    source: event.source,
    eventType: event.eventType,
    symbol: event.symbol ?? null,
    assetClass: event.assetClass ?? null,
    severity: event.severity,
    title: event.title,
    description: event.description,
  });
  return createHash('sha256').update(payload).digest('hex');
}

function toBucketHour(observedAt: string): string {
  const date = new Date(observedAt);
  date.setUTCMinutes(0, 0, 0);
  return date.toISOString();
}

export async function upsertObservationEvents(events: ObservationEventInput[]): Promise<string[]> {
  const client = createDatabaseClient();
  if (!client.isConfigured || events.length === 0) return [];

  try {
    const ids: string[] = [];
    await client.transaction(async (tx) => {
      for (const event of events) {
        const fingerprint = buildFingerprint(event);
        const bucketHour = toBucketHour(event.observedAt);
        const rows = await tx.query<{ id: string }>(
          `insert into app.observation_events (
            workspace_id, user_id, asset_id, symbol, asset_class, source, event_type, severity,
            title, description, confidence, score, related_signal_id, related_news_id, related_risk_id,
            related_decision_id, related_order_id, metadata, fingerprint, bucket_hour, observed_at
          ) values (
            $1::uuid,$2::uuid,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18::jsonb,$19,$20,$21
          )
          on conflict (fingerprint, bucket_hour) do update
            set observed_at = excluded.observed_at
          returning id`,
          [
            event.workspaceId ?? null,
            event.userId ?? null,
            event.assetId ?? null,
            event.symbol ?? null,
            event.assetClass ?? null,
            event.source,
            event.eventType,
            event.severity,
            event.title,
            event.description,
            event.confidence ?? null,
            event.score ?? null,
            event.relatedSignalId ?? null,
            event.relatedNewsId ?? null,
            event.relatedRiskId ?? null,
            event.relatedDecisionId ?? null,
            event.relatedOrderId ?? null,
            JSON.stringify(event.metadata ?? {}),
            fingerprint,
            bucketHour,
            event.observedAt,
          ],
        );
        if (rows[0]?.id) ids.push(rows[0].id);
      }
    });
    return ids;
  } catch (error) {
    if (isMissingTable(error)) return [];
    throw error;
  }
}

export async function listObservationEvents(filters: ObservationEventFilters = {}): Promise<ObservationEventRecord[]> {
  const client = createDatabaseClient();
  if (!client.isConfigured) return [];
  const limit = Math.min(Math.max(filters.limit ?? 120, 1), 500);

  try {
    const rows = await client.query<ObservationEventRow>(
      `select
        e.id,
        e.workspace_id as "workspaceId",
        e.user_id as "userId",
        e.asset_id as "assetId",
        e.symbol,
        e.asset_class as "assetClass",
        e.source,
        e.event_type as "eventType",
        e.severity,
        e.title,
        e.description,
        e.confidence,
        e.score,
        e.related_signal_id as "relatedSignalId",
        e.related_news_id as "relatedNewsId",
        e.related_risk_id as "relatedRiskId",
        e.related_decision_id as "relatedDecisionId",
        e.related_order_id as "relatedOrderId",
        e.metadata,
        e.fingerprint,
        e.observed_at as "observedAt",
        e.created_at as "createdAt",
        coalesce(s.is_read, false) as read,
        coalesce(s.is_pinned, false) as pinned,
        coalesce(s.is_dismissed, false) as dismissed
      from app.observation_events e
      left join app.observation_event_states s
        on s.event_id = e.id and s.user_id = $1::uuid
      where ($2::text is null or e.source = $2::text)
        and ($3::text is null or e.severity = $3::text)
        and ($4::text is null or e.symbol ilike $4::text)
      order by e.observed_at desc
      limit ${limit}`,
      [filters.userId ?? null, filters.source ?? null, filters.severity ?? null, filters.symbol ? `%${filters.symbol}%` : null],
    );

    return rows.map((row) => ({
      ...row,
      metadata: row.metadata ?? {},
    }));
  } catch (error) {
    if (isMissingTable(error)) return [];
    throw error;
  }
}

export async function getObservationEvent(id: string, userId?: string | null): Promise<ObservationEventRecord | null> {
  const rows = await listObservationEvents({ userId, limit: 500 });
  return rows.find((row) => row.id === id) ?? null;
}

export async function pruneObservationEvents(retentionDays = 30): Promise<void> {
  const client = createDatabaseClient();
  if (!client.isConfigured) return;
  try {
    await client.execute(
      `delete from app.observation_events
       where created_at < now() - ($1::int * interval '1 day')`,
      [retentionDays],
    );
  } catch (error) {
    if (isMissingTable(error)) return;
    throw error;
  }
}

async function upsertState(eventId: string, userId: string, patch: { read?: boolean; pinned?: boolean; dismissed?: boolean }) {
  const client = createDatabaseClient();
  if (!client.isConfigured) return;
  try {
    await client.execute(
      `insert into app.observation_event_states (event_id, user_id, is_read, is_pinned, is_dismissed, updated_at)
       values ($1::uuid, $2::uuid, $3, $4, $5, now())
       on conflict (event_id, user_id) do update set
         is_read = excluded.is_read,
         is_pinned = excluded.is_pinned,
         is_dismissed = excluded.is_dismissed,
         updated_at = now()`,
      [eventId, userId, patch.read ?? false, patch.pinned ?? false, patch.dismissed ?? false],
    );
  } catch (error) {
    if (isMissingTable(error)) return;
    throw error;
  }
}

export async function markObservationEventRead(eventId: string, userId: string, read = true): Promise<void> {
  await upsertState(eventId, userId, { read });
}

export async function markObservationEventPinned(eventId: string, userId: string, pinned = true): Promise<void> {
  await upsertState(eventId, userId, { pinned });
}

export async function markObservationEventDismissed(eventId: string, userId: string, dismissed = true): Promise<void> {
  await upsertState(eventId, userId, { dismissed });
}
