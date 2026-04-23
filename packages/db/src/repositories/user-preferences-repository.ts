import type { DashboardPreset, WatchlistItem } from '@repo/api-contracts';
import { dashboardPresetSchema, watchlistItemSchema } from '@repo/api-contracts';
import { createDatabaseClient, type DatabaseClient } from '../client';

const dashboardPresetsTable = 'app.user_dashboard_presets';
const watchlistItemsTable = 'app.user_watchlist_items';

type DashboardPresetRow = {
  locale: string;
  defaultChartType: string;
  defaultTimePeriod: string;
  trackedSymbols: unknown;
  visibleModules: unknown;
  simulationPreferences: unknown;
  activityPreferences: unknown;
};

type WatchlistRow = {
  assetId: string;
  symbol: string;
  assetClass: string;
  addedAt: string | Date;
};

export function createDefaultDashboardPreset(): DashboardPreset {
  return {
    locale: 'en',
    defaultChartType: 'trend',
    defaultTimePeriod: '1mo',
    trackedSymbols: ['AAPL', 'MSFT', 'NVDA', 'SPY', 'BINANCE:BTCUSDT'],
    visibleModules: ['market-overview', 'watchlist', 'forecast-analysis', 'broker-tools', 'system-observation'],
    simulationPreferences: {
      preferredBrokerMode: 'manual_stock_lane',
      brokerModeCapitalLimitUsd: 50000,
      microTradeAllocationPercent: 8,
      defaultAssetScope: 'stock',
    },
    activityPreferences: {
      orderActivityDigest: true,
      laneStatusAlerts: true,
    },
  };
}

function parseStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === 'string');
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed)
        ? parsed.filter((entry): entry is string => typeof entry === 'string')
        : [];
    } catch {
      return [];
    }
  }

  return [];
}

function toIsoString(value: string | Date) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function parseObject(value: unknown): Record<string, unknown> {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return {};
    }
  }

  return {};
}

function mapPresetRow(row: DashboardPresetRow | undefined): DashboardPreset {
  if (!row) {
    return createDefaultDashboardPreset();
  }

  const defaultPreset = createDefaultDashboardPreset();

  return dashboardPresetSchema.parse({
    locale: row.locale,
    defaultChartType: row.defaultChartType,
    defaultTimePeriod: row.defaultTimePeriod,
    trackedSymbols: parseStringArray(row.trackedSymbols),
    visibleModules: parseStringArray(row.visibleModules),
    simulationPreferences: {
      ...defaultPreset.simulationPreferences,
      ...parseObject(row.simulationPreferences),
    },
    activityPreferences: {
      ...defaultPreset.activityPreferences,
      ...parseObject(row.activityPreferences),
    },
  });
}

function mapWatchlistRow(row: WatchlistRow): WatchlistItem {
  return watchlistItemSchema.parse({
    assetId: row.assetId,
    symbol: row.symbol,
    assetClass: row.assetClass,
    addedAt: toIsoString(row.addedAt),
  });
}

function isMissingPreferencesSchemaError(error: unknown) {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return false;
  }

  const databaseError = error as { code?: string };
  return databaseError.code === '42P01' || databaseError.code === '42703';
}

function getConfiguredClient() {
  const client = createDatabaseClient();
  return client.isConfigured ? client : null;
}

async function getPresetWithClient(client: DatabaseClient, userId: string) {
  const rows = await client.query<DashboardPresetRow>(
    `
      select
        locale,
        default_chart_type as "defaultChartType",
        default_time_period as "defaultTimePeriod",
        tracked_symbols as "trackedSymbols",
        visible_modules as "visibleModules",
        simulation_preferences as "simulationPreferences",
        activity_preferences as "activityPreferences"
      from ${dashboardPresetsTable}
      where user_id = $1
      limit 1
    `,
    [userId],
  );

  return mapPresetRow(rows[0]);
}

export async function getUserDashboardPreset(userId: string): Promise<DashboardPreset> {
  const client = getConfiguredClient();

  if (!client) {
    return createDefaultDashboardPreset();
  }

  try {
    return await getPresetWithClient(client, userId);
  } catch (error) {
    if (isMissingPreferencesSchemaError(error)) {
      return createDefaultDashboardPreset();
    }

    throw error;
  }
}

export async function saveUserDashboardPreset(userId: string, preset: DashboardPreset): Promise<DashboardPreset> {
  const parsed = dashboardPresetSchema.parse(preset);
  const client = getConfiguredClient();

  if (!client) {
    return parsed;
  }

  try {
    await client.execute(
      `
        insert into ${dashboardPresetsTable} (
          user_id,
          locale,
          default_chart_type,
          default_time_period,
          tracked_symbols,
          visible_modules,
          simulation_preferences,
          activity_preferences
        ) values ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb, $8::jsonb)
        on conflict (user_id) do update set
          locale = excluded.locale,
          default_chart_type = excluded.default_chart_type,
          default_time_period = excluded.default_time_period,
          tracked_symbols = excluded.tracked_symbols,
          visible_modules = excluded.visible_modules,
          simulation_preferences = excluded.simulation_preferences,
          activity_preferences = excluded.activity_preferences,
          updated_at = now()
      `,
      [
        userId,
        parsed.locale,
        parsed.defaultChartType,
        parsed.defaultTimePeriod,
        JSON.stringify(parsed.trackedSymbols),
        JSON.stringify(parsed.visibleModules),
        JSON.stringify(parsed.simulationPreferences),
        JSON.stringify(parsed.activityPreferences),
      ],
    );
  } catch (error) {
    if (isMissingPreferencesSchemaError(error)) {
      return parsed;
    }

    throw error;
  }

  return parsed;
}

export async function getUserWatchlist(userId: string): Promise<WatchlistItem[]> {
  const client = getConfiguredClient();

  if (!client) {
    return [];
  }

  try {
    const rows = await client.query<WatchlistRow>(
      `
        select
          asset_id as "assetId",
          symbol,
          asset_class as "assetClass",
          added_at as "addedAt"
        from ${watchlistItemsTable}
        where user_id = $1
        order by added_at desc, created_at desc
      `,
      [userId],
    );

    return rows.map(mapWatchlistRow);
  } catch (error) {
    if (isMissingPreferencesSchemaError(error)) {
      return [];
    }

    throw error;
  }
}

export async function toggleWatchlistItem(userId: string, item: WatchlistItem): Promise<WatchlistItem[]> {
  const parsed = watchlistItemSchema.parse(item);
  const client = getConfiguredClient();

  if (!client) {
    return [parsed];
  }

  try {
    return client.transaction(async (transactionClient) => {
      const existing = await transactionClient.query<{ assetId: string }>(
        `
          select asset_id as "assetId"
          from ${watchlistItemsTable}
          where user_id = $1
            and asset_id = $2
          limit 1
        `,
        [userId, parsed.assetId],
      );

      if (existing[0]) {
        await transactionClient.execute(
          `
            delete from ${watchlistItemsTable}
            where user_id = $1
              and asset_id = $2
          `,
          [userId, parsed.assetId],
        );
      } else {
        await transactionClient.execute(
          `
            insert into ${watchlistItemsTable} (
              user_id,
              asset_id,
              symbol,
              asset_class,
              added_at
            ) values ($1, $2, $3, $4, $5)
            on conflict (user_id, asset_id) do update set
              symbol = excluded.symbol,
              asset_class = excluded.asset_class,
              added_at = excluded.added_at,
              updated_at = now()
          `,
          [userId, parsed.assetId, parsed.symbol, parsed.assetClass, parsed.addedAt],
        );
      }

      const rows = await transactionClient.query<WatchlistRow>(
        `
          select
            asset_id as "assetId",
            symbol,
            asset_class as "assetClass",
            added_at as "addedAt"
          from ${watchlistItemsTable}
          where user_id = $1
          order by added_at desc, created_at desc
        `,
        [userId],
      );

      return rows.map(mapWatchlistRow);
    });
  } catch (error) {
    if (isMissingPreferencesSchemaError(error)) {
      return [parsed];
    }

    throw error;
  }
}
