import type {
  SimulationAccountSummary,
  SimulationExecutionInput,
  SimulationOrder,
  SimulationPosition,
  SimulationSnapshot,
  SimulationTransaction,
  SimulationWorkspace,
} from '@repo/api-contracts';
import {
  simulationAccountSummarySchema,
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

type AccountRow = {
  accountId: string;
  portfolioId: string;
  currency: 'USD';
  initialCashBalance: number | string;
  cashBalance: number | string;
  realizedPnl: number | string;
  allowNegativeBalance: boolean;
  updatedAt: string | Date;
};

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

function isEffectivelyZero(value: number) {
  return Math.abs(value) <= 1e-8;
}

function toIso(value: string | Date | null | undefined) {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mapOrder(row: OrderRow): SimulationOrder {
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

  await client.execute(
    `
      insert into ${accountsTable} (
        id,
        user_id,
        base_currency,
        initial_cash_balance,
        cash_balance,
        realized_pnl
      ) values ($1, $2, 'USD', $3, $3, 0)
    `,
    [accountId, userId, initialCash],
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
    currency: 'USD' as const,
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

    const grossAmount = roundCurrency(quantity * parsed.executionPrice);
    const requestedPrice = parsed.requestedPrice ?? parsed.executionPrice;
    const orderNotes = parsed.idempotencyKey
      ? `idem:${parsed.idempotencyKey};${parsed.notes ?? ''}`
      : (parsed.notes ?? null);
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

    if (parsed.side === 'buy' && !allowNegativeBalance && currentCash < grossAmount) {
      throw new Error('Insufficient fictive cash balance for this order.');
    }

    if (parsed.side === 'sell' && currentQuantity + 1e-8 < quantity) {
      throw new Error('Insufficient position quantity for this sell order.');
    }

    const now = new Date().toISOString();
    const orderId = crypto.randomUUID();
    const positionId = currentPosition?.id ?? crypto.randomUUID();
    let nextCashBalance = currentCash;
    let realizedPnl = 0;

    if (parsed.side === 'buy') {
      const nextQuantity = roundQuantity(currentQuantity + quantity);
      const nextAverageCost =
        nextQuantity === 0
          ? 0
          : roundQuantity(((currentQuantity * currentAverageCost) + (quantity * parsed.executionPrice)) / nextQuantity);

      nextCashBalance = roundCurrency(currentCash - grossAmount);
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
      realizedPnl = roundCurrency((parsed.executionPrice - currentAverageCost) * quantity);
      const rawNextQuantity = roundQuantity(currentQuantity - quantity);
      const nextQuantity = isEffectivelyZero(rawNextQuantity) ? 0 : rawNextQuantity;
      nextCashBalance = roundCurrency(currentCash + grossAmount);

      await transactionClient.execute(
        `
          update ${positionsTable}
          set
            quantity = $2,
            realized_pnl = coalesce(realized_pnl, 0) + $3,
            closed_at = case when $2 = 0 then $4 else null end,
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
          cash_balance = $2,
          realized_pnl = realized_pnl + $3,
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
        parsed.executionPrice,
        grossAmount,
        parsed.side === 'buy' ? -grossAmount : grossAmount,
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
        ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 0, $13, $14, $15, $16)
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
        parsed.executionPrice,
        grossAmount,
        parsed.side === 'buy' ? -grossAmount : grossAmount,
        realizedPnl,
        `${parsed.side === 'buy' ? 'Bought' : 'Sold'} ${quantity} ${parsed.symbol} at ${parsed.executionPrice.toFixed(2)} USD`,
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
