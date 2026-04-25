import { simulationSessionSchema } from '@repo/api-contracts';
import { createDatabaseClient } from '../client';
const sessionsTable = 'app.simulation_sessions';
function assertDatabaseConfigured(client) {
    if (!client.isConfigured) {
        throw new Error('DATABASE_URL must point to a Postgres database to use simulation sessions.');
    }
}
function toNumber(value) {
    if (typeof value === 'number') {
        return value;
    }
    if (typeof value === 'string') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
}
function toIso(value) {
    if (!value) {
        return null;
    }
    return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
function mapSessionRow(row) {
    return simulationSessionSchema.parse({
        id: row.id,
        userId: row.userId,
        laneId: row.laneId,
        laneMode: row.laneMode,
        status: row.status,
        observationStatus: row.observationStatus,
        observationMessage: row.observationMessage,
        assetScope: row.assetScope,
        maxCapitalUsd: toNumber(row.maxCapitalUsd),
        microAllocationPercent: toNumber(row.microAllocationPercent),
        decisionSource: row.decisionSource,
        lastHeartbeatAt: toIso(row.lastHeartbeatAt),
        startedAt: toIso(row.startedAt),
        pausedAt: toIso(row.pausedAt),
        stoppedAt: toIso(row.stoppedAt),
        completedAt: toIso(row.completedAt),
        failedAt: toIso(row.failedAt),
        lastError: row.lastError,
        createdAt: toIso(row.createdAt),
        updatedAt: toIso(row.updatedAt),
        lastOpenedAt: toIso(row.lastOpenedAt),
    });
}
async function listSimulationSessionsByPreference(client, userId) {
    const rows = await client.query(`
      select
        id,
        user_id as "userId",
        lane_id as "laneId",
        lane_mode as "laneMode",
        status,
        observation_status as "observationStatus",
        observation_message as "observationMessage",
        asset_scope as "assetScope",
        max_capital_usd as "maxCapitalUsd",
        micro_allocation_percent as "microAllocationPercent",
        decision_source as "decisionSource",
        last_heartbeat_at as "lastHeartbeatAt",
        started_at as "startedAt",
        paused_at as "pausedAt",
        stopped_at as "stoppedAt",
        completed_at as "completedAt",
        failed_at as "failedAt",
        last_error as "lastError",
        created_at as "createdAt",
        updated_at as "updatedAt",
        last_opened_at as "lastOpenedAt"
      from ${sessionsTable}
      where user_id = $1
      order by
        case status
          when 'running' then 0
          when 'paused' then 1
          when 'draft' then 2
          else 3
        end asc,
        updated_at desc
      limit 25
    `, [userId]);
    return rows.map(mapSessionRow);
}
export async function listSimulationSessionsForUser(userId) {
    const client = createDatabaseClient();
    assertDatabaseConfigured(client);
    return listSimulationSessionsByPreference(client, userId);
}
export async function getSimulationSessionByIdForUser(userId, sessionId) {
    const client = createDatabaseClient();
    assertDatabaseConfigured(client);
    const [row] = await client.query(`
      select
        id,
        user_id as "userId",
        lane_id as "laneId",
        lane_mode as "laneMode",
        status,
        observation_status as "observationStatus",
        observation_message as "observationMessage",
        asset_scope as "assetScope",
        max_capital_usd as "maxCapitalUsd",
        micro_allocation_percent as "microAllocationPercent",
        decision_source as "decisionSource",
        last_heartbeat_at as "lastHeartbeatAt",
        started_at as "startedAt",
        paused_at as "pausedAt",
        stopped_at as "stoppedAt",
        completed_at as "completedAt",
        failed_at as "failedAt",
        last_error as "lastError",
        created_at as "createdAt",
        updated_at as "updatedAt",
        last_opened_at as "lastOpenedAt"
      from ${sessionsTable}
      where user_id = $1
        and id = $2
      limit 1
    `, [userId, sessionId]);
    return row ? mapSessionRow(row) : null;
}
export async function getPreferredSimulationSessionForUser(userId, preferredSessionId) {
    const client = createDatabaseClient();
    assertDatabaseConfigured(client);
    if (preferredSessionId) {
        const preferred = await getSimulationSessionByIdForUser(userId, preferredSessionId);
        if (preferred) {
            return preferred;
        }
    }
    const ranked = await listSimulationSessionsByPreference(client, userId);
    return ranked[0] ?? null;
}
export async function startOrResumeSimulationSession(input) {
    const client = createDatabaseClient();
    assertDatabaseConfigured(client);
    return client.transaction(async (transactionClient) => {
        const [activeRow] = await transactionClient.query(`
        select
          id,
          user_id as "userId",
          lane_id as "laneId",
          lane_mode as "laneMode",
          status,
          observation_status as "observationStatus",
          observation_message as "observationMessage",
          asset_scope as "assetScope",
          max_capital_usd as "maxCapitalUsd",
          micro_allocation_percent as "microAllocationPercent",
          decision_source as "decisionSource",
          last_heartbeat_at as "lastHeartbeatAt",
          started_at as "startedAt",
          paused_at as "pausedAt",
          stopped_at as "stoppedAt",
          completed_at as "completedAt",
          failed_at as "failedAt",
          last_error as "lastError",
          created_at as "createdAt",
          updated_at as "updatedAt",
          last_opened_at as "lastOpenedAt"
        from ${sessionsTable}
        where user_id = $1
          and lane_id = $2
          and status in ('draft', 'starting', 'running', 'paused', 'stopping')
        order by updated_at desc
        limit 1
        for update
      `, [input.userId, input.laneId]);
        if (activeRow) {
            const [updatedRow] = await transactionClient.query(`
          update ${sessionsTable}
          set
            lane_mode = $3,
            status = 'running',
            observation_status = case
              when observation_status = 'error' then 'warming'
              when observation_status = 'idle' then 'warming'
              else observation_status
            end,
            observation_message = case
              when observation_status in ('error', 'idle')
                then 'Session resumed and waiting for fresh observation heartbeat.'
              else observation_message
            end,
            asset_scope = $4,
            max_capital_usd = $5,
            micro_allocation_percent = $6,
            decision_source = $7,
            started_at = coalesce(started_at, now()),
            paused_at = null,
            stopped_at = null,
            completed_at = null,
            failed_at = null,
            last_error = null,
            updated_at = now()
          where id = $1
            and user_id = $2
          returning
            id,
            user_id as "userId",
            lane_id as "laneId",
            lane_mode as "laneMode",
            status,
            observation_status as "observationStatus",
            observation_message as "observationMessage",
            asset_scope as "assetScope",
            max_capital_usd as "maxCapitalUsd",
            micro_allocation_percent as "microAllocationPercent",
            decision_source as "decisionSource",
            last_heartbeat_at as "lastHeartbeatAt",
            started_at as "startedAt",
            paused_at as "pausedAt",
            stopped_at as "stoppedAt",
            completed_at as "completedAt",
            failed_at as "failedAt",
            last_error as "lastError",
            created_at as "createdAt",
            updated_at as "updatedAt",
            last_opened_at as "lastOpenedAt"
        `, [
                activeRow.id,
                input.userId,
                input.laneMode,
                input.assetScope,
                input.maxCapitalUsd,
                input.microAllocationPercent,
                input.decisionSource,
            ]);
            if (!updatedRow) {
                throw new Error('Failed to resume the simulation session.');
            }
            return mapSessionRow(updatedRow);
        }
        const [createdRow] = await transactionClient.query(`
        insert into ${sessionsTable} (
          id,
          user_id,
          lane_id,
          lane_mode,
          status,
          observation_status,
          observation_message,
          asset_scope,
          max_capital_usd,
          micro_allocation_percent,
          decision_source,
          started_at,
          created_at,
          updated_at
        ) values ($1, $2, $3, $4, 'running', 'warming', 'Session started and waiting for first observation pulse.', $5, $6, $7, $8, now(), now(), now())
        returning
          id,
          user_id as "userId",
          lane_id as "laneId",
          lane_mode as "laneMode",
          status,
          observation_status as "observationStatus",
          observation_message as "observationMessage",
          asset_scope as "assetScope",
          max_capital_usd as "maxCapitalUsd",
          micro_allocation_percent as "microAllocationPercent",
          decision_source as "decisionSource",
          last_heartbeat_at as "lastHeartbeatAt",
          started_at as "startedAt",
          paused_at as "pausedAt",
          stopped_at as "stoppedAt",
          completed_at as "completedAt",
          failed_at as "failedAt",
          last_error as "lastError",
          created_at as "createdAt",
          updated_at as "updatedAt",
          last_opened_at as "lastOpenedAt"
      `, [
            crypto.randomUUID(),
            input.userId,
            input.laneId,
            input.laneMode,
            input.assetScope,
            input.maxCapitalUsd,
            input.microAllocationPercent,
            input.decisionSource,
        ]);
        if (!createdRow) {
            throw new Error('Failed to create the simulation session.');
        }
        return mapSessionRow(createdRow);
    });
}
export async function markSimulationSessionOpened(userId, sessionId) {
    const client = createDatabaseClient();
    assertDatabaseConfigured(client);
    await client.execute(`
      update ${sessionsTable}
      set
        last_opened_at = now(),
        updated_at = now()
      where user_id = $1
        and id = $2
    `, [userId, sessionId]);
}
export async function updateSimulationObservationHealth() {
    const client = createDatabaseClient();
    assertDatabaseConfigured(client);
    const [result] = await client.query(`
      with refreshed as (
        update ${sessionsTable}
        set
          observation_status = case
            when status = 'failed' then 'error'
            when status in ('stopped', 'completed') then 'idle'
            when exists (
              select 1
              from app.market_quote_snapshots q
              where q.observed_at is not null
                and q.observed_at >= now() - interval '20 minutes'
            ) then 'watching'
            when exists (
              select 1
              from app.market_quote_snapshots q
              where q.observed_at is not null
                and q.observed_at >= now() - interval '90 minutes'
            ) then 'degraded'
            else 'error'
          end,
          observation_message = case
            when status = 'failed' then coalesce(last_error, 'Session failed and requires manual restart.')
            when status in ('stopped', 'completed') then 'Session is inactive.'
            when exists (
              select 1
              from app.market_quote_snapshots q
              where q.observed_at is not null
                and q.observed_at >= now() - interval '20 minutes'
            ) then 'Observation feed is healthy.'
            when exists (
              select 1
              from app.market_quote_snapshots q
              where q.observed_at is not null
                and q.observed_at >= now() - interval '90 minutes'
            ) then 'Observation feed is stale; workstation is read-only until freshness recovers.'
            else 'Observation feed is unavailable; workstation is read-only.'
          end,
          last_heartbeat_at = now(),
          updated_at = now()
        where status in ('draft', 'starting', 'running', 'paused', 'stopping', 'stopped', 'completed', 'failed')
        returning id
      )
      select count(*)::int as count
      from refreshed
    `);
    return result?.count ?? 0;
}
