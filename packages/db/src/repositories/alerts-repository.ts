import { createHash } from 'node:crypto';
import { createDatabaseClient } from '../client';

function toIsoString(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  return String(value);
}

export type AlertSource =
  | 'signal'
  | 'news'
  | 'risk'
  | 'provider'
  | 'portfolio'
  | 'anomaly'
  | 'broker'
  | 'simulation'
  | 'regime'
  | 'relationship';
export type AlertCategory =
  | 'market'
  | 'signal'
  | 'anomaly'
  | 'provider'
  | 'liquidity'
  | 'volatility'
  | 'portfolio'
  | 'simulation'
  | 'cross_asset';
export type AlertSeverity = 'INFO' | 'WATCH' | 'WARNING' | 'CRITICAL';
export type AlertStatus = 'OPEN' | 'READ' | 'PINNED' | 'SNOOZED' | 'DISMISSED' | 'RESOLVED';

export type AlertInput = {
  observationEventId?: string | null;
  workspaceId?: string | null;
  userId?: string | null;
  assetId?: string | null;
  symbol?: string | null;
  assetClass?: string | null;
  source: AlertSource;
  category: AlertCategory;
  severity: AlertSeverity;
  title: string;
  description: string;
  confidence?: number | null;
  score?: number | null;
  status?: AlertStatus;
  dedupeKey?: string | null;
  cooldownBucket?: string | null;
  metadata?: Record<string, unknown>;
  firstSeenAt: string;
  lastSeenAt: string;
};

export type AlertRecord = AlertInput & {
  id: string;
  dedupeKey: string;
  cooldownBucket: string;
  createdAt: string;
  updatedAt: string;
};

export type AlertFilters = {
  userId?: string | null;
  severity?: AlertSeverity | null;
  category?: AlertCategory | null;
  source?: AlertSource | null;
  status?: AlertStatus | null;
  symbol?: string | null;
  assetClass?: string | null;
  search?: string | null;
  limit?: number;
};

type AlertRow = {
  id: string;
  observationEventId: string | null;
  workspaceId: string | null;
  userId: string | null;
  assetId: string | null;
  symbol: string | null;
  assetClass: string | null;
  source: AlertSource;
  category: AlertCategory;
  severity: AlertSeverity;
  title: string;
  description: string;
  confidence: number | null;
  score: number | null;
  status: AlertStatus;
  dedupeKey: string;
  cooldownBucket: string;
  metadata: Record<string, unknown>;
  firstSeenAt: string;
  lastSeenAt: string;
  createdAt: string;
  updatedAt: string;
};

function isMissingTable(error: unknown) {
  if (typeof error !== 'object' || error === null || !('code' in error)) return false;
  const e = error as { code?: string };
  return e.code === '42P01' || e.code === '42703';
}

function hashDedupeKey(alert: AlertInput) {
  if (alert.dedupeKey && alert.dedupeKey.trim().length > 0) {
    return alert.dedupeKey.trim();
  }
  const payload = JSON.stringify({
    source: alert.source,
    category: alert.category,
    severity: alert.severity,
    symbol: alert.symbol ?? null,
    title: alert.title,
  });
  return createHash('sha256').update(payload).digest('hex');
}

function toCooldownBucket(input: string | null | undefined, timestamp: string) {
  if (input && input.trim().length > 0) return input.trim();
  const date = new Date(timestamp);
  date.setUTCMinutes(0, 0, 0);
  return date.toISOString();
}

function dedupeScope(alert: AlertInput) {
  if (alert.userId) return `user:${alert.userId}`;
  if (alert.workspaceId) return `workspace:${alert.workspaceId}`;
  return 'global';
}

export async function upsertAlerts(alerts: AlertInput[]): Promise<string[]> {
  const client = createDatabaseClient();
  if (!client.isConfigured || alerts.length === 0) return [];
  try {
    const ids: string[] = [];
    await client.transaction(async (tx) => {
      for (const alert of alerts) {
        const dedupeKey = hashDedupeKey(alert);
        const cooldownBucket = toCooldownBucket(alert.cooldownBucket, alert.lastSeenAt);
        const rows = await tx.query<{ id: string }>(
          `insert into app.alerts (
            observation_event_id, workspace_id, user_id, asset_id, symbol, asset_class, source, category, severity, title, description,
            confidence, score, status, dedupe_key, cooldown_bucket, dedupe_scope, metadata, first_seen_at, last_seen_at, updated_at
          ) values (
            $1::uuid, $2::uuid, $3::uuid, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18::jsonb, $19, $20, now()
          )
          on conflict (dedupe_key, cooldown_bucket, dedupe_scope) do update
            set last_seen_at = excluded.last_seen_at,
                confidence = excluded.confidence,
                score = excluded.score,
                metadata = excluded.metadata,
                updated_at = now()
          returning id`,
          [
            alert.observationEventId ?? null,
            alert.workspaceId ?? null,
            alert.userId ?? null,
            alert.assetId ?? null,
            alert.symbol ?? null,
            alert.assetClass ?? null,
            alert.source,
            alert.category,
            alert.severity,
            alert.title,
            alert.description,
            alert.confidence ?? null,
            alert.score ?? null,
            alert.status ?? 'OPEN',
            dedupeKey,
            cooldownBucket,
            dedupeScope(alert),
            JSON.stringify(alert.metadata ?? {}),
            alert.firstSeenAt,
            alert.lastSeenAt,
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

export async function listAlerts(filters: AlertFilters = {}): Promise<AlertRecord[]> {
  const client = createDatabaseClient();
  if (!client.isConfigured) return [];
  const limit = Math.min(Math.max(filters.limit ?? 300, 1), 1000);
  try {
    const rows = await client.query<AlertRow>(
      `select
        a.id,
        a.observation_event_id as "observationEventId",
        a.workspace_id as "workspaceId",
        a.user_id as "userId",
        a.asset_id as "assetId",
        a.symbol,
        a.asset_class as "assetClass",
        a.source,
        a.category,
        a.severity,
        a.title,
        a.description,
        a.confidence,
        a.score,
        coalesce(s.status, a.status) as status,
        a.dedupe_key as "dedupeKey",
        a.cooldown_bucket as "cooldownBucket",
        a.metadata,
        a.first_seen_at as "firstSeenAt",
        a.last_seen_at as "lastSeenAt",
        a.created_at as "createdAt",
        a.updated_at as "updatedAt"
      from app.alerts a
      left join app.alert_states s
        on s.alert_id = a.id and s.user_id = $1::uuid
      where ($2::text is null or a.severity = $2::text)
        and ($3::text is null or a.category = $3::text)
        and ($4::text is null or a.source = $4::text)
        and ($5::text is null or coalesce(s.status, a.status) = $5::text)
        and ($6::text is null or a.symbol ilike $6::text)
        and ($7::text is null or a.asset_class = $7::text)
        and ($8::text is null or a.title ilike $8::text or a.description ilike $8::text)
      order by a.last_seen_at desc
      limit ${limit}`,
      [
        filters.userId ?? null,
        filters.severity ?? null,
        filters.category ?? null,
        filters.source ?? null,
        filters.status ?? null,
        filters.symbol ? `%${filters.symbol}%` : null,
        filters.assetClass ?? null,
        filters.search ? `%${filters.search}%` : null,
      ],
    );
    return rows.map((row) => ({
      ...row,
      metadata: row.metadata ?? {},
<<<<<<< HEAD
      // The postgres driver parses timestamp columns as Date objects. AlertRecord
      // is consumed by a server component that asserts serializable props before
      // passing the model to a client component, where Date is not allowed.
      // Normalize to ISO strings at the repository boundary so the declared
      // `string` types are truthful and RSC serialization succeeds.
=======
>>>>>>> 713c5ec (fix alert center)
      firstSeenAt: toIsoString(row.firstSeenAt),
      lastSeenAt: toIsoString(row.lastSeenAt),
      createdAt: toIsoString(row.createdAt),
      updatedAt: toIsoString(row.updatedAt),
    }));
  } catch (error) {
    if (isMissingTable(error)) return [];
    throw error;
  }
}

function toIsoString(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number') {
    return new Date(value).toISOString();
  }
  return '';
}

export async function getAlert(id: string, userId?: string | null): Promise<AlertRecord | null> {
  const rows = await listAlerts({ userId, limit: 500 });
  return rows.find((row) => row.id === id) ?? null;
}

export async function updateAlertState(id: string, userId: string, state: AlertStatus): Promise<void> {
  const client = createDatabaseClient();
  if (!client.isConfigured) return;
  try {
    await client.execute(
      `insert into app.alert_states (alert_id, user_id, status, updated_at)
       values ($1::uuid, $2::uuid, $3::text, now())
       on conflict (alert_id, user_id) do update set
         status = excluded.status,
         updated_at = now()`,
      [id, userId, state],
    );
  } catch (error) {
    if (isMissingTable(error)) return;
    throw error;
  }
}

export async function snoozeAlert(id: string, userId: string, untilIso: string): Promise<void> {
  const client = createDatabaseClient();
  if (!client.isConfigured) return;
  try {
    await client.execute(
      `insert into app.alert_states (alert_id, user_id, status, snoozed_until, updated_at)
       values ($1::uuid, $2::uuid, 'SNOOZED', $3::timestamptz, now())
       on conflict (alert_id, user_id) do update set
         status = 'SNOOZED',
         snoozed_until = excluded.snoozed_until,
         updated_at = now()`,
      [id, userId, untilIso],
    );
  } catch (error) {
    if (isMissingTable(error)) return;
    throw error;
  }
}

export async function dismissAlert(id: string, userId: string): Promise<void> {
  await updateAlertState(id, userId, 'DISMISSED');
}

export async function resolveAlert(id: string, userId: string): Promise<void> {
  await updateAlertState(id, userId, 'RESOLVED');
}

export async function pruneAlerts(retentionDays = 30): Promise<void> {
  const client = createDatabaseClient();
  if (!client.isConfigured) return;
  try {
    await client.execute(
      `delete from app.alerts where created_at < now() - ($1::int * interval '1 day')`,
      [retentionDays],
    );
  } catch (error) {
    if (isMissingTable(error)) return;
    throw error;
  }
}

export async function pruneResolvedAndDismissedAlerts(retentionDays = 30): Promise<void> {
  const client = createDatabaseClient();
  if (!client.isConfigured) return;
  try {
    await client.execute(
      `delete from app.alerts a
       where a.id in (
         select s.alert_id
         from app.alert_states s
         where s.status in ('RESOLVED', 'DISMISSED')
           and s.updated_at < now() - ($1::int * interval '1 day')
       )`,
      [retentionDays],
    );
  } catch (error) {
    if (isMissingTable(error)) return;
    throw error;
  }
}
