import { createHash } from 'node:crypto';
import type {
  SimulationAccountSummary,
  SimulationExecutionModel,
  SimulationExecutionRecord,
  SimulationExecutionInput,
  SimulationOrder,
  SimulationPosition,
  SimulationSnapshot,
  SimulationTransaction,
  SimulationWorkspace,
} from '@repo/api-contracts';
import {
  simulationAccountSummarySchema,
  simulationExecutionModelSchema,
  simulationExecutionRecordSchema,
  simulationExecutionInputSchema,
  simulationOrderSchema,
  simulationPositionSchema,
  simulationSnapshotSchema,
  simulationTransactionSchema,
  simulationWorkspaceSchema,
} from '@repo/api-contracts';
import { createDatabaseClient, type DatabaseClient } from '../client';
import { getLatestMarketQuoteSnapshots } from './market-data-repository';

const accountsTable = 'app.simulation_accounts';
const portfoliosTable = 'app.simulation_portfolios';
const positionsTable = 'app.simulation_positions';
const ordersTable = 'app.simulation_orders';
const transactionsTable = 'app.simulation_transactions';
const snapshotsTable = 'app.simulation_snapshots';
const simulationAgentDecisionsTable = 'app.simulation_agent_decisions';
const simulationAgentOrderLinksTable = 'app.simulation_agent_order_links';
const DEFAULT_AI_SIMULATION_STRATEGY_TAG = 'ai_simulation_agent_v1';

type AccountRow = {
  accountId: string;
  portfolioId: string;
  currency: 'USD' | 'EUR';
  initialCashBalance: number | string;
  cashBalance: number | string;
  realizedPnl: number | string;
  allowNegativeBalance: boolean;
  updatedAt: string | Date;
};

function getDefaultSimulationCurrency(): 'USD' | 'EUR' {
  const configured = (process.env.SIMULATION_DEFAULT_CASH_CURRENCY ?? 'EUR').trim().toUpperCase();
  return configured === 'USD' ? 'USD' : 'EUR';
}

type PositionRow = {
  id: string;
  assetId: string;
  symbol: string;
  assetClass: 'stock' | 'etf' | 'crypto';
  quantity: number | string;
  averageCost: number | string;
  realizedPnl: number | string;
  openedAt: string | Date | null;
  closedAt: string | Date | null;
  updatedAt: string | Date;
};

type OrderRow = {
  id: string;
  assetId: string;
  symbol: string;
  assetClass: 'stock' | 'etf' | 'crypto';
  side: 'buy' | 'sell';
  status: 'filled' | 'rejected' | 'cancelled';
  quantity: number | string;
  requestedPrice: number | string;
  executedPrice: number | string;
  grossAmount: number | string;
  cashEffect: number | string;
  realizedPnl: number | string;
  notes: string | null;
  createdAt: string | Date;
  executedAt: string | Date;
};

type TransactionRow = {
  id: string;
  orderId: string | null;
  positionId: string | null;
  transactionType: 'initial_funding' | 'buy' | 'sell' | 'reset';
  assetId: string | null;
  symbol: string | null;
  assetClass: 'stock' | 'etf' | 'crypto' | null;
  quantity: number | string | null;
  price: number | string | null;
  grossAmount: number | string;
  feeAmount: number | string;
  cashDelta: number | string;
  realizedPnl: number | string;
  description: string;
  createdAt: string | Date;
};

type SnapshotRow = {
  id: string;
  cashBalance: number | string;
  marketValue: number | string;
  equityValue: number | string;
  unrealizedPnl: number | string;
  realizedPnl: number | string;
  positionCount: number;
  takenAt: string | Date;
};

type SimulationAgentDecisionRow = {
  id: string;
};

export type InsertSimulationAgentDecisionInput = {
  userId: string;
  accountId?: string | null;
  portfolioId?: string | null;
  sessionId?: string | null;
  laneId?: string | null;
  mode: 'suggest_only' | 'human_confirmed' | 'autonomous_simulation';
  action: 'HOLD' | 'PROPOSE_BUY' | 'PROPOSE_SELL' | 'SIMULATED_BUY_REQUEST' | 'SIMULATED_SELL_REQUEST';
  symbol?: string | null;
  assetClass?: 'stock' | 'etf' | 'crypto' | null;
  confidence?: number | null;
  proposedNotional?: number | null;
  maxNotionalPerTrade?: number | null;
  maxDailyNotional?: number | null;
  rankedSnapshotHash?: string | null;
  decisionJson: Record<string, unknown>;
  rejectedReason?: string | null;
};

export type LinkSimulationAgentDecisionToOrderInput = {
  decisionId: string;
  simulationOrderId: string;
  userId: string;
  linkType?: 'autonomous_submission' | 'human_confirmation';
  accountId?: string | null;
  portfolioId?: string | null;
  sessionId?: string | null;
  laneId?: string | null;
  notional: number;
};

function assertDatabaseConfigured(client: DatabaseClient) {
  if (!client.isConfigured) {
    throw new Error('DATABASE_URL must point to a Postgres database to use the simulation repository.');
  }
}

function toNumber(value: number | string | null | undefined) {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function roundQuantity(value: number) {
  return Math.round((value + Number.EPSILON) * 1e8) / 1e8;
}

function roundPrice(value: number) {
  return Math.round((value + Number.EPSILON) * 1e8) / 1e8;
}

function isEffectivelyZero(value: number) {
  return Math.abs(value) <= 1e-8;
}

function toIso(value: string | Date | null | undefined) {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function normalizeExecutionModel(model?: Partial<SimulationExecutionModel>): SimulationExecutionModel {
  return simulationExecutionModelSchema.parse({
    feeBps: model?.feeBps ?? 0,
    slippageBps: model?.slippageBps ?? 0,
    latencyMs: model?.latencyMs ?? 0,
    venue: model?.venue ?? 'simulation_engine',
  });
}

function applySlippage(
  requestedPrice: number,
  side: 'buy' | 'sell',
  slippageBps: number,
) {
  const slippageMultiplier = slippageBps / 10_000;
  if (slippageMultiplier <= 0) {
    return requestedPrice;
  }

  const adjusted =
    side === 'buy'
      ? requestedPrice * (1 + slippageMultiplier)
      : requestedPrice * (1 - slippageMultiplier);

  return roundPrice(Math.max(adjusted, Number.EPSILON));
}

function buildValidationHash(input: {
  userId: string;
  assetId: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  requestedPrice: number;
  executionPrice: number;
  feeAmount: number;
  model: SimulationExecutionModel;
}) {
  const payload = JSON.stringify(input);
  return createHash('sha256').update(payload).digest('hex');
}

function encodeOrderNotes(input: {
  idempotencyKey?: string | undefined;
  userNotes?: string | undefined;
  executionRecord: SimulationExecutionRecord;
}) {
  const payload = JSON.stringify({
    userNotes: input.userNotes ?? null,
    executionRecord: input.executionRecord,
  });

  return input.idempotencyKey ? `idem:${input.idempotencyKey};${payload}` : payload;
}

function extractExecutionRecordFromNotes(notes: string | null): SimulationExecutionRecord | null {
  if (!notes) {
    return null;
  }

  let payload = notes;

  if (payload.startsWith('idem:')) {
    const separatorIndex = payload.indexOf(';');
    payload = separatorIndex >= 0 ? payload.slice(separatorIndex + 1) : '';
  }

  if (!payload) {
    return null;
  }

  try {
    const parsedPayload = JSON.parse(payload) as { executionRecord?: unknown };
    const parsedRecord = simulationExecutionRecordSchema.safeParse(parsedPayload.executionRecord);
    return parsedRecord.success ? parsedRecord.data : null;
  } catch {
    return null;
  }
}

function mapOrder(row: OrderRow): SimulationOrder {
  const executionRecord = extractExecutionRecordFromNotes(row.notes);

  return simulationOrderSchema.parse({
    id: row.id,
    assetId: row.assetId,
    symbol: row.symbol,
    assetClass: row.assetClass,
    side: row.side,
    status: row.status,
    quantity: toNumber(row.quantity),
    requestedPrice: toNumber(row.requestedPrice),
    executedPrice: toNumber(row.executedPrice),
    grossAmount: toNumber(row.grossAmount),
    cashEffect: toNumber(row.cashEffect),
    realizedPnl: toNumber(row.realizedPnl),
    notes: row.notes,
    executionRecord,
    createdAt: toIso(row.createdAt),
    executedAt: toIso(row.executedAt),
  });
}

function mapTransaction(row: TransactionRow): SimulationTransaction {
  return simulationTransactionSchema.parse({
    id: row.id,
    orderId: row.orderId,
    positionId: row.positionId,
    transactionType: row.transactionType,
    assetId: row.assetId,
    symbol: row.symbol,
    assetClass: row.assetClass,
    quantity: row.quantity === null ? null : toNumber(row.quantity),
    price: row.price === null ? null : toNumber(row.price),
    grossAmount: toNumber(row.grossAmount),
    feeAmount: toNumber(row.feeAmount),
    cashDelta: toNumber(row.cashDelta),
    realizedPnl: toNumber(row.realizedPnl),
    description: row.description,
    createdAt: toIso(row.createdAt),
  });
}

function mapSnapshot(row: SnapshotRow): SimulationSnapshot {
  return simulationSnapshotSchema.parse({
    id: row.id,
    cashBalance: toNumber(row.cashBalance),
    marketValue: toNumber(row.marketValue),
    equityValue: toNumber(row.equityValue),
    unrealizedPnl: toNumber(row.unrealizedPnl),
    realizedPnl: toNumber(row.realizedPnl),
    positionCount: row.positionCount,
    takenAt: toIso(row.takenAt),
  });
}

async function ensureSimulationAccount(client: DatabaseClient, userId: string) {
  const existing = await client.query<AccountRow>(
    `
      select
        a.id as "accountId",
        p.id as "portfolioId",
        a.base_currency as currency,
        a.initial_cash_balance as "initialCashBalance",
        a.cash_balance as "cashBalance",
        a.realized_pnl as "realizedPnl",
        a.allow_negative_balance as "allowNegativeBalance",
        a.updated_at as "updatedAt"
      from ${accountsTable} a
      join ${portfoliosTable} p on p.account_id = a.id
      where a.user_id = $1
      limit 1
    `,
    [userId],
  );

  const current = existing[0];
  if (current) {
    return current;
  }

  const accountId = crypto.randomUUID();
  const portfolioId = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const initialCash = 100000;
  const defaultCurrency = getDefaultSimulationCurrency();

  await client.execute(
    `
      insert into ${accountsTable} (
        id,
        user_id,
        base_currency,
        initial_cash_balance,
        cash_balance,
        realized_pnl
      ) values ($1, $2, $3, $4, $4, 0)
    `,
    [accountId, userId, defaultCurrency, initialCash],
  );

  await client.execute(
    `
      insert into ${portfoliosTable} (id, account_id, name)
      values ($1, $2, 'Primary simulation portfolio')
    `,
    [portfolioId, accountId],
  );

  await client.execute(
    `
      insert into ${transactionsTable} (
        id,
        account_id,
        portfolio_id,
        transaction_type,
        gross_amount,
        fee_amount,
        cash_delta,
        realized_pnl,
        description,
        created_at
      ) values ($1, $2, $3, 'initial_funding', $4, 0, $4, 0, 'Initial fictive funding', $5)
    `,
    [crypto.randomUUID(), accountId, portfolioId, initialCash, createdAt],
  );

  await client.execute(
    `
      insert into ${snapshotsTable} (
        id,
        account_id,
        portfolio_id,
        cash_balance,
        market_value,
        equity_value,
        unrealized_pnl,
        realized_pnl,
        position_count,
        taken_at
      ) values ($1, $2, $3, $4, 0, $4, 0, 0, 0, $5)
    `,
    [crypto.randomUUID(), accountId, portfolioId, initialCash, createdAt],
  );

  return {
    accountId,
    portfolioId,
    currency: defaultCurrency,
    initialCashBalance: initialCash,
    cashBalance: initialCash,
    realizedPnl: 0,
    allowNegativeBalance: false,
    updatedAt: createdAt,
  };
}

export async function hasSimulationAccountForUser(userId: string): Promise<boolean> {
  const client = createDatabaseClient();
  assertDatabaseConfigured(client);
  const rows = await client.query<{ accountId: string }>(
    `
      select a.id as "accountId"
      from ${accountsTable} a
      where a.user_id = $1
      limit 1
    `,
    [userId],
  );

  return Boolean(rows[0]?.accountId);
}

async function captureSnapshot(client: DatabaseClient, accountId: string, portfolioId: string) {
  const [accountRow] = await client.query<{ cashBalance: number | string; realizedPnl: number | string }>(
    `
      select cash_balance as "cashBalance", realized_pnl as "realizedPnl"
      from ${accountsTable}
      where id = $1
      limit 1
    `,
    [accountId],
  );

  const [positionAggregate] = await client.query<{ marketValue: number | string; costBasis: number | string; positionCount: number }>(
    `
      select
        coalesce(sum(quantity * coalesce(q.price, average_cost)), 0) as "marketValue",
        coalesce(sum(quantity * average_cost), 0) as "costBasis",
        count(*)::int as "positionCount"
      from ${positionsTable} p
      left join app.market_quote_snapshots q on q.symbol = p.symbol
      where p.portfolio_id = $1
        and p.quantity > 0
    `,
    [portfolioId],
  );

  const cashBalance = roundCurrency(toNumber(accountRow?.cashBalance));
  const marketValue = roundCurrency(toNumber(positionAggregate?.marketValue));
  const equityValue = roundCurrency(cashBalance + marketValue);
  const unrealizedPnl = roundCurrency(marketValue - toNumber(positionAggregate?.costBasis));
  const realizedPnl = roundCurrency(toNumber(accountRow?.realizedPnl));

  await client.execute(
    `
      insert into ${snapshotsTable} (
        id,
        account_id,
        portfolio_id,
        cash_balance,
        market_value,
        equity_value,
        unrealized_pnl,
        realized_pnl,
        position_count
      ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `,
    [
      crypto.randomUUID(),
      accountId,
      portfolioId,
      cashBalance,
      marketValue,
      equityValue,
      unrealizedPnl,
      realizedPnl,
      positionAggregate?.positionCount ?? 0,
    ],
  );
}

export async function listSimulatedOrdersForUser(userId: string): Promise<SimulationOrder[]> {
  const client = createDatabaseClient();
  assertDatabaseConfigured(client);

  const account = await ensureSimulationAccount(client, userId);
  const rows = await client.query<OrderRow>(
    `
      select
        id,
        asset_id as "assetId",
        symbol,
        asset_class as "assetClass",
        side,
        status,
        quantity,
        requested_price as "requestedPrice",
        executed_price as "executedPrice",
        gross_amount as "grossAmount",
        cash_effect as "cashEffect",
        realized_pnl as "realizedPnl",
        notes,
        created_at as "createdAt",
        executed_at as "executedAt"
      from ${ordersTable}
      where account_id = $1
      order by created_at desc
      limit 25
    `,
    [account.accountId],
  );

  return rows.map(mapOrder);
}

export async function insertSimulationAgentDecision(
  input: InsertSimulationAgentDecisionInput,
): Promise<{ id: string }> {
  const client = createDatabaseClient();
  assertDatabaseConfigured(client);

  const [row] = await client.query<SimulationAgentDecisionRow>(
    `
      insert into ${simulationAgentDecisionsTable} (
        id,
        user_id,
        account_id,
        portfolio_id,
        session_id,
        lane_id,
        mode,
        action,
        symbol,
        asset_class,
        confidence,
        proposed_notional,
        max_notional_per_trade,
        max_daily_notional,
        ranked_snapshot_hash,
        decision_json,
        rejected_reason,
        decision_payload,
        decision_action,
        autonomy_mode
      )
      values (
        gen_random_uuid(),
        $1::uuid,
        $2::uuid,
        $3::uuid,
        $4::uuid,
        $5,
        $6,
        $7,
        $8,
        $9,
        $10,
        $11,
        $12,
        $13,
        $14,
        $15::jsonb,
        $16,
        $15::jsonb,
        $7,
        $6
      )
      returning id
    `,
    [
      input.userId,
      input.accountId ?? null,
      input.portfolioId ?? null,
      input.sessionId ?? null,
      input.laneId ?? null,
      input.mode,
      input.action,
      input.symbol ?? null,
      input.assetClass ?? null,
      input.confidence ?? null,
      input.proposedNotional ?? null,
      input.maxNotionalPerTrade ?? null,
      input.maxDailyNotional ?? null,
      input.rankedSnapshotHash ?? null,
      JSON.stringify(input.decisionJson),
      input.rejectedReason ?? null,
    ],
  );

  if (!row?.id) {
    throw new Error('Failed to persist simulation agent decision audit row.');
  }

  return { id: row.id };
}

export async function linkSimulationAgentDecisionToOrder(
  input: LinkSimulationAgentDecisionToOrderInput,
): Promise<void> {
  const client = createDatabaseClient();
  assertDatabaseConfigured(client);

  const [decision] = await client.query<{
    sessionId: string | null;
    laneId: string | null;
    accountId: string | null;
    portfolioId: string | null;
  }>(
    `
      select
        session_id as "sessionId",
        lane_id as "laneId",
        account_id as "accountId",
        portfolio_id as "portfolioId"
      from ${simulationAgentDecisionsTable}
      where id = $1
      limit 1
    `,
    [input.decisionId],
  );

  await client.execute(
    `
      insert into ${simulationAgentOrderLinksTable} (
        id,
        decision_id,
        simulation_order_id,
        order_id,
        link_type,
        user_id,
        account_id,
        portfolio_id,
        session_id,
        lane_id,
        notional
      )
      values (
        gen_random_uuid(),
        $1,
        $2,
        $2,
        $9,
        $3,
        $4::uuid,
        $5::uuid,
        $6::uuid,
        $7,
        $8
      )
      on conflict do nothing
    `,
    [
      input.decisionId,
      input.simulationOrderId,
      input.userId,
      input.accountId ?? decision?.accountId ?? null,
      input.portfolioId ?? decision?.portfolioId ?? null,
      input.sessionId ?? decision?.sessionId ?? null,
      input.laneId ?? decision?.laneId ?? null,
      input.notional,
      input.linkType ?? 'autonomous_submission',
    ],
  );
}

function getUtcDayStartIso(reference: Date = new Date()): string {
  return new Date(
    Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), reference.getUTCDate()),
  ).toISOString();
}

async function queryTodayAiNotionalFromOrderLinks(input: {
  client: DatabaseClient;
  userId: string;
  laneId: string | null;
  since: string;
}): Promise<{ notional: number; rowCount: number }> {
  const laneFilterSql = input.laneId ? 'and lane_id = $3' : '';
  const params = input.laneId
    ? [input.userId, input.since, input.laneId]
    : [input.userId, input.since];

  const [row] = await input.client.query<{ notional: number | string; rowCount: number }>(
    `
      select
        coalesce(sum(notional), 0) as notional,
        count(*)::int as "rowCount"
      from ${simulationAgentOrderLinksTable}
      where user_id = $1
        and created_at >= $2
        ${laneFilterSql}
    `,
    params,
  );

  return {
    notional: roundCurrency(toNumber(row?.notional)),
    rowCount: row?.rowCount ?? 0,
  };
}

async function queryTodayAiNotionalFromNotes(input: {
  client: DatabaseClient;
  accountId: string;
  laneId: string | null;
  strategyTag: string;
  since: string;
}): Promise<number> {
  const strategyPattern = `%[strategy:${input.strategyTag.trim()}]%`;
  const autonomousPattern = '%[source:ai_autonomous]%';
  const suggestedPattern = '%[source:ai_suggested]%';

  const [row] = await input.client.query<{ grossAmount: number | string }>(
    `
      select
        coalesce(sum(gross_amount), 0) as "grossAmount"
      from ${ordersTable}
      where account_id = $1
        and created_at >= $2
        and notes like $3
        and (notes like $4 or notes like $5)
        and ($6::text is null or notes ilike ('%lane=' || $6 || '%'))
    `,
    [input.accountId, input.since, strategyPattern, autonomousPattern, suggestedPattern, input.laneId],
  );

  return roundCurrency(toNumber(row?.grossAmount));
}

export async function getTodayAiSimulationOrderNotionalForUser(
  userId: string,
  strategyTag: string = DEFAULT_AI_SIMULATION_STRATEGY_TAG,
  laneId: string | null = null,
): Promise<number> {
  const client = createDatabaseClient();
  assertDatabaseConfigured(client);

  const account = await ensureSimulationAccount(client, userId);
  const since = getUtcDayStartIso();

  try {
    const structured = await queryTodayAiNotionalFromOrderLinks({
      client,
      userId,
      laneId,
      since,
    });

    if (structured.rowCount > 0) {
      return structured.notional;
    }

    // Transition fallback: pre-metadata rows are still encoded in notes.
    return queryTodayAiNotionalFromNotes({
      client,
      accountId: account.accountId,
      laneId,
      strategyTag,
      since,
    });
  } catch (structuredError) {
    try {
      return await queryTodayAiNotionalFromNotes({
        client,
        accountId: account.accountId,
        laneId,
        strategyTag,
        since,
      });
    } catch (fallbackError) {
      throw new Error(
        `Unable to determine AI simulation daily notional usage safely. ` +
          `Structured query failed: ${
            structuredError instanceof Error ? structuredError.message : String(structuredError)
          }. Fallback query failed: ${
            fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
          }.`,
      );
    }
  }
}

export async function listSimulationTransactionsForUser(userId: string): Promise<SimulationTransaction[]> {
  const client = createDatabaseClient();
  assertDatabaseConfigured(client);

  const account = await ensureSimulationAccount(client, userId);
  const rows = await client.query<TransactionRow>(
    `
      select
        id,
        order_id as "orderId",
        position_id as "positionId",
        transaction_type as "transactionType",
        asset_id as "assetId",
        symbol,
        asset_class as "assetClass",
        quantity,
        price,
        gross_amount as "grossAmount",
        fee_amount as "feeAmount",
        cash_delta as "cashDelta",
        realized_pnl as "realizedPnl",
        description,
        created_at as "createdAt"
      from ${transactionsTable}
      where account_id = $1
      order by created_at desc
      limit 50
    `,
    [account.accountId],
  );

  return rows.map(mapTransaction);
}

export async function listSimulationSnapshotsForUser(userId: string): Promise<SimulationSnapshot[]> {
  const client = createDatabaseClient();
  assertDatabaseConfigured(client);

  const account = await ensureSimulationAccount(client, userId);
  const rows = await client.query<SnapshotRow>(
    `
      select
        id,
        cash_balance as "cashBalance",
        market_value as "marketValue",
        equity_value as "equityValue",
        unrealized_pnl as "unrealizedPnl",
        realized_pnl as "realizedPnl",
        position_count as "positionCount",
        taken_at as "takenAt"
      from ${snapshotsTable}
      where account_id = $1
      order by taken_at desc
      limit 20
    `,
    [account.accountId],
  );

  return rows.map(mapSnapshot);
}

export async function getSimulationWorkspace(
  userId: string,
  marketPrices: Record<string, number | null> = {},
): Promise<SimulationWorkspace> {
  const client = createDatabaseClient();
  assertDatabaseConfigured(client);

  const account = await ensureSimulationAccount(client, userId);
  const [positions, closedPositions, orders, transactions, snapshots] = await Promise.all([
    client.query<PositionRow>(
      `
        select
          id,
          asset_id as "assetId",
          symbol,
          asset_class as "assetClass",
          quantity,
          average_cost as "averageCost",
          realized_pnl as "realizedPnl",
          opened_at as "openedAt",
          closed_at as "closedAt",
          updated_at as "updatedAt"
        from ${positionsTable}
        where portfolio_id = $1
          and quantity > 0
        order by updated_at desc
      `,
      [account.portfolioId],
    ),
    client.query<PositionRow>(
      `
        select
          id,
          asset_id as "assetId",
          symbol,
          asset_class as "assetClass",
          quantity,
          average_cost as "averageCost",
          realized_pnl as "realizedPnl",
          opened_at as "openedAt",
          closed_at as "closedAt",
          updated_at as "updatedAt"
        from ${positionsTable}
        where portfolio_id = $1
          and (quantity <= 0 or closed_at is not null)
        order by updated_at desc
        limit 25
      `,
      [account.portfolioId],
    ),
    listSimulatedOrdersForUser(userId),
    listSimulationTransactionsForUser(userId),
    listSimulationSnapshotsForUser(userId),
  ]);

  const symbols = positions.map((row) => row.symbol);
  let effectiveMarketPrices = marketPrices;

  if (symbols.length > 0 && Object.keys(effectiveMarketPrices).length === 0) {
    const snapshots = await getLatestMarketQuoteSnapshots(symbols);
    effectiveMarketPrices = Object.fromEntries(snapshots.map((snapshot) => [snapshot.symbol, snapshot.price]));
  }

  const mappedPositions = positions.map((row) => {
    const quantity = toNumber(row.quantity);
    const averageCost = toNumber(row.averageCost);
    const costBasis = roundCurrency(quantity * averageCost);
    const marketPrice = effectiveMarketPrices[row.symbol] ?? null;
    const effectivePrice = marketPrice ?? averageCost;
    const marketValue = roundCurrency(quantity * effectivePrice);
    const unrealizedPnl = roundCurrency(marketValue - costBasis);

    return simulationPositionSchema.parse({
      id: row.id,
      assetId: row.assetId,
      symbol: row.symbol,
      assetClass: row.assetClass,
      quantity,
      averageCost,
      marketPrice,
      marketValue,
      costBasis,
      unrealizedPnl,
      realizedPnl: roundCurrency(toNumber(row.realizedPnl)),
      openedAt: toIso(row.openedAt),
      closedAt: toIso(row.closedAt),
      updatedAt: toIso(row.updatedAt),
    });
  });

  const mappedClosedPositions = closedPositions.map((row) =>
    simulationPositionSchema.parse({
      id: row.id,
      assetId: row.assetId,
      symbol: row.symbol,
      assetClass: row.assetClass,
      quantity: roundQuantity(toNumber(row.quantity)),
      averageCost: toNumber(row.averageCost),
      marketPrice: null,
      marketValue: 0,
      costBasis: 0,
      unrealizedPnl: 0,
      realizedPnl: roundCurrency(toNumber(row.realizedPnl)),
      openedAt: toIso(row.openedAt),
      closedAt: toIso(row.closedAt),
      updatedAt: toIso(row.updatedAt),
    }),
  );

  const portfolioValue = roundCurrency(mappedPositions.reduce((sum, item) => sum + item.marketValue, 0));
  const investedCapital = roundCurrency(mappedPositions.reduce((sum, item) => sum + item.costBasis, 0));
  const unrealizedPnl = roundCurrency(mappedPositions.reduce((sum, item) => sum + item.unrealizedPnl, 0));
  const cashBalance = roundCurrency(toNumber(account.cashBalance));
  const reservedCash = 0;
  const availableCash = roundCurrency(Math.max(0, cashBalance - reservedCash));
  const realizedPnl = roundCurrency(toNumber(account.realizedPnl));

  const summary: SimulationAccountSummary = simulationAccountSummarySchema.parse({
    accountId: account.accountId,
    portfolioId: account.portfolioId,
    currency: account.currency,
    quoteCurrency: 'USD',
    fxConversionAvailable: false,
    fxConversionNote: 'No FX conversion available.',
    initialCashBalance: roundCurrency(toNumber(account.initialCashBalance)),
    cashBalance,
    reservedCash,
    availableCash,
    investedCapital,
    portfolioValue,
    equityValue: roundCurrency(cashBalance + portfolioValue),
    unrealizedPnl,
    realizedPnl,
    buyingPower: availableCash,
    activeInvestmentCount: mappedPositions.length,
    closedInvestmentCount: mappedClosedPositions.length,
    positionCount: mappedPositions.length,
    updatedAt: toIso(account.updatedAt),
  });

  return simulationWorkspaceSchema.parse({
    summary,
    positions: mappedPositions,
    closedPositions: mappedClosedPositions,
    orders,
    transactions,
    snapshots,
  });
}

export async function getSimulationWorkspaceIfExists(
  userId: string,
  marketPrices: Record<string, number | null> = {},
): Promise<SimulationWorkspace | null> {
  const exists = await hasSimulationAccountForUser(userId);

  if (!exists) {
    return null;
  }

  return getSimulationWorkspace(userId, marketPrices);
}

export async function createSimulatedOrder(input: SimulationExecutionInput): Promise<SimulationOrder> {
  const parsed = simulationExecutionInputSchema.parse(input);
  return executeSimulationOrder(parsed);
}

export async function executeSimulationOrder(input: SimulationExecutionInput): Promise<SimulationOrder> {
  const parsed = simulationExecutionInputSchema.parse(input);
  const client = createDatabaseClient();
  assertDatabaseConfigured(client);

  return client.transaction(async (transactionClient) => {
    const account = await ensureSimulationAccount(transactionClient, parsed.userId);

    if (parsed.idempotencyKey) {
      const [existing] = await transactionClient.query<OrderRow>(
        `
          select
            id,
            asset_id as "assetId",
            symbol,
            asset_class as "assetClass",
            side,
            status,
            quantity,
            requested_price as "requestedPrice",
            executed_price as "executedPrice",
            gross_amount as "grossAmount",
            cash_effect as "cashEffect",
            realized_pnl as "realizedPnl",
            notes,
            created_at as "createdAt",
            executed_at as "executedAt"
          from ${ordersTable}
          where account_id = $1
            and notes like $2
          limit 1
        `,
        [account.accountId, `idem:${parsed.idempotencyKey};%`],
      );
      if (existing) {
        return mapOrder(existing);
      }
    }

    const quantity = roundQuantity(parsed.quantity);

    if (quantity <= 0) {
      throw new Error('Order quantity must be greater than zero.');
    }

    const requestedPrice = roundPrice(parsed.requestedPrice ?? parsed.executionPrice);
    const executionModel = normalizeExecutionModel(parsed.executionModel);
    const executionPrice = applySlippage(requestedPrice, parsed.side, executionModel.slippageBps);
    const grossAmount = roundCurrency(quantity * executionPrice);
    const feeAmount = roundCurrency(grossAmount * (executionModel.feeBps / 10_000));
    const effectiveCashEffect = parsed.side === 'buy'
      ? roundCurrency(-(grossAmount + feeAmount))
      : roundCurrency(grossAmount - feeAmount);
    const now = new Date().toISOString();
    const executionRecord = simulationExecutionRecordSchema.parse({
      executionId: crypto.randomUUID(),
      requestedPrice,
      executionPrice,
      slippageAmount:
        parsed.side === 'buy'
          ? roundPrice(executionPrice - requestedPrice)
          : roundPrice(requestedPrice - executionPrice),
      slippageBps: executionModel.slippageBps,
      feeAmount,
      notionalAmount: grossAmount,
      latencyMs: executionModel.latencyMs,
      validationHash: buildValidationHash({
        userId: parsed.userId,
        assetId: parsed.assetId,
        symbol: parsed.symbol,
        side: parsed.side,
        quantity,
        requestedPrice,
        executionPrice,
        feeAmount,
        model: executionModel,
      }),
      venue: executionModel.venue,
      model: executionModel,
      recordedAt: now,
    });
    const orderNotes = encodeOrderNotes({
      idempotencyKey: parsed.idempotencyKey,
      userNotes: parsed.notes,
      executionRecord,
    });
    const [lockedAccount] = await transactionClient.query<{ cashBalance: number | string; allowNegativeBalance: boolean }>(
      `
        select
          cash_balance as "cashBalance",
          allow_negative_balance as "allowNegativeBalance"
        from ${accountsTable}
        where id = $1
        limit 1
        for update
      `,
      [account.accountId],
    );
    const [currentPosition] = await transactionClient.query<PositionRow>(
      `
        select
          id,
          asset_id as "assetId",
          symbol,
          asset_class as "assetClass",
          quantity,
          average_cost as "averageCost",
          realized_pnl as "realizedPnl",
          opened_at as "openedAt",
          closed_at as "closedAt",
          updated_at as "updatedAt"
        from ${positionsTable}
        where portfolio_id = $1
          and asset_id = $2
        limit 1
        for update
      `,
      [account.portfolioId, parsed.assetId],
    );

    const currentQuantity = currentPosition ? roundQuantity(toNumber(currentPosition.quantity)) : 0;
    const currentAverageCost = currentPosition ? toNumber(currentPosition.averageCost) : 0;
    const currentCash = roundCurrency(toNumber(lockedAccount?.cashBalance ?? account.cashBalance));
    const allowNegativeBalance = lockedAccount?.allowNegativeBalance ?? account.allowNegativeBalance;

    if (
      currentPosition &&
      (currentPosition.assetId !== parsed.assetId ||
        currentPosition.symbol !== parsed.symbol ||
        currentPosition.assetClass !== parsed.assetClass)
    ) {
      throw new Error('Position metadata mismatch detected. Refresh and submit the order again.');
    }

    if (parsed.side === 'buy' && !allowNegativeBalance && currentCash < Math.abs(effectiveCashEffect)) {
      throw new Error('Insufficient fictive cash balance for this order.');
    }

    if (parsed.side === 'sell' && currentQuantity + 1e-8 < quantity) {
      throw new Error('Insufficient position quantity for this sell order.');
    }

    const orderId = crypto.randomUUID();
    const positionId = currentPosition?.id ?? crypto.randomUUID();
    let nextCashBalance = currentCash;
    let realizedPnl = 0;

    if (parsed.side === 'buy') {
      const nextQuantity = roundQuantity(currentQuantity + quantity);
      const nextAverageCost =
        nextQuantity === 0
          ? 0
          : roundQuantity(((currentQuantity * currentAverageCost) + grossAmount + feeAmount) / nextQuantity);

      nextCashBalance = roundCurrency(currentCash + effectiveCashEffect);
      if (!allowNegativeBalance && nextCashBalance < 0) {
        nextCashBalance = 0;
      }

      if (currentPosition) {
        await transactionClient.execute(
          `
            update ${positionsTable}
            set
              quantity = $2,
              average_cost = $3,
              updated_at = $4,
              closed_at = null,
              opened_at = coalesce(opened_at, $4)
            where id = $1
          `,
          [positionId, nextQuantity, nextAverageCost, now],
        );
      } else {
        await transactionClient.execute(
          `
            insert into ${positionsTable} (
              id,
              portfolio_id,
              asset_id,
              symbol,
              asset_class,
              quantity,
              average_cost,
              realized_pnl,
              opened_at,
              created_at,
              updated_at
            ) values ($1, $2, $3, $4, $5, $6, $7, 0, $8, $8, $8)
          `,
          [positionId, account.portfolioId, parsed.assetId, parsed.symbol, parsed.assetClass, nextQuantity, nextAverageCost, now],
        );
      }
    } else {
      realizedPnl = roundCurrency((executionPrice - currentAverageCost) * quantity - feeAmount);
      const rawNextQuantity = roundQuantity(currentQuantity - quantity);
      const nextQuantity = isEffectivelyZero(rawNextQuantity) ? 0 : rawNextQuantity;
      nextCashBalance = roundCurrency(currentCash + effectiveCashEffect);

      await transactionClient.execute(
        `
          update ${positionsTable}
          set
            quantity = $2::numeric,
            realized_pnl = coalesce(realized_pnl, 0) + $3::numeric,
            closed_at = case when $2::numeric = 0 then $4 else null end,
            updated_at = $4
          where id = $1
        `,
        [positionId, nextQuantity, realizedPnl, now],
      );
    }

    await transactionClient.execute(
      `
        update ${accountsTable}
        set
          cash_balance = $2::numeric,
          realized_pnl = realized_pnl + $3::numeric,
          updated_at = $4
        where id = $1
      `,
      [account.accountId, nextCashBalance, realizedPnl, now],
    );

    await transactionClient.execute(
      `
        insert into ${ordersTable} (
          id,
          account_id,
          portfolio_id,
          asset_id,
          symbol,
          asset_class,
          side,
          status,
          order_type,
          quantity,
          requested_price,
          executed_price,
          gross_amount,
          cash_effect,
          realized_pnl,
          notes,
          created_at,
          updated_at,
          executed_at
        ) values ($1, $2, $3, $4, $5, $6, $7, 'filled', 'market', $8, $9, $10, $11, $12, $13, $14, $15, $15, $15)
      `,
      [
        orderId,
        account.accountId,
        account.portfolioId,
        parsed.assetId,
        parsed.symbol,
        parsed.assetClass,
        parsed.side,
        quantity,
        requestedPrice,
        executionPrice,
        grossAmount,
        effectiveCashEffect,
        realizedPnl,
        orderNotes,
        now,
      ],
    );

    await transactionClient.execute(
      `
        insert into ${transactionsTable} (
          id,
          account_id,
          portfolio_id,
          order_id,
          position_id,
          transaction_type,
          asset_id,
          symbol,
          asset_class,
          quantity,
          price,
          gross_amount,
          fee_amount,
          cash_delta,
          realized_pnl,
          description,
          created_at
        ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      `,
      [
        crypto.randomUUID(),
        account.accountId,
        account.portfolioId,
        orderId,
        positionId,
        parsed.side,
        parsed.assetId,
        parsed.symbol,
        parsed.assetClass,
        quantity,
        executionPrice,
        grossAmount,
        feeAmount,
        effectiveCashEffect,
        realizedPnl,
        `${parsed.side === 'buy' ? 'Bought' : 'Sold'} ${quantity} ${parsed.symbol} at ${executionPrice.toFixed(2)} USD (fee ${feeAmount.toFixed(2)} USD)`,
        now,
      ],
    );

    await captureSnapshot(transactionClient, account.accountId, account.portfolioId);

    const [createdOrder] = await transactionClient.query<OrderRow>(
      `
        select
          id,
          asset_id as "assetId",
          symbol,
          asset_class as "assetClass",
          side,
          status,
          quantity,
          requested_price as "requestedPrice",
          executed_price as "executedPrice",
          gross_amount as "grossAmount",
          cash_effect as "cashEffect",
          realized_pnl as "realizedPnl",
          notes,
          created_at as "createdAt",
          executed_at as "executedAt"
        from ${ordersTable}
        where id = $1
        limit 1
      `,
      [orderId],
    );

    if (!createdOrder) {
      throw new Error('Failed to load the simulation order that was just created.');
    }

    return mapOrder(createdOrder);
  });
}

export async function resetSimulationAccount(userId: string): Promise<void> {
  const client = createDatabaseClient();
  assertDatabaseConfigured(client);

  return client.transaction(async (transactionClient) => {
    const account = await ensureSimulationAccount(transactionClient, userId);
    const initialCash = roundCurrency(toNumber(account.initialCashBalance));
    const now = new Date().toISOString();

    await transactionClient.execute(
      `
        update ${positionsTable}
        set
          quantity = 0,
          closed_at = $2,
          updated_at = $2
        where portfolio_id = $1
          and quantity > 0
      `,
      [account.portfolioId, now],
    );

    await transactionClient.execute(
      `
        update ${accountsTable}
        set
          cash_balance = $2,
          realized_pnl = 0,
          updated_at = $3
        where id = $1
      `,
      [account.accountId, initialCash, now],
    );

    await transactionClient.execute(
      `
        insert into ${transactionsTable} (
          id,
          account_id,
          portfolio_id,
          transaction_type,
          gross_amount,
          fee_amount,
          cash_delta,
          realized_pnl,
          description,
          created_at
        ) values ($1, $2, $3, 'reset', 0, 0, 0, 0, 'Simulation account reset', $4)
      `,
      [crypto.randomUUID(), account.accountId, account.portfolioId, now],
    );

    await captureSnapshot(transactionClient, account.accountId, account.portfolioId);
  });
}

export async function captureSimulationSnapshotsForAllAccounts(): Promise<number> {
  const client = createDatabaseClient();
  assertDatabaseConfigured(client);

  const accounts = await client.query<{ accountId: string; portfolioId: string }>(
    `
      select distinct
        a.id as "accountId",
        p.id as "portfolioId"
      from ${accountsTable} a
      join ${portfoliosTable} p on p.account_id = a.id
      join app.simulation_sessions s on s.user_id = a.user_id
      where s.status = 'running'
    `,
  );

  for (const account of accounts) {
    await captureSnapshot(client, account.accountId, account.portfolioId);
  }

  return accounts.length;
}
