import type {
  InvestPortfolioViewModel,
  PortfolioAllocationItem,
  PortfolioFilterState,
  PortfolioPositionItem,
  PortfolioRecentTrade,
  RouteStatus,
} from '@repo/api-contracts';
import { investPortfolioViewModelSchema } from '@repo/api-contracts';
import type { PortfolioReadModel } from '../queries/portfolio-query';

export type PortfolioFilterInput = Partial<PortfolioFilterState>;

function toRouteStatus(workstationStatus: PortfolioReadModel['workstation']['workstationStatus']): RouteStatus {
  if (workstationStatus === 'running') return 'nominal';
  if (workstationStatus === 'paused' || workstationStatus === 'degraded' || workstationStatus === 'empty') return 'attention';
  return 'degraded';
}

function inferOrderSource(notes: string | null): PortfolioRecentTrade['source'] {
  if (!notes) return 'unknown';
  if (notes.includes('ai_autonomous')) return 'ai_autonomous';
  if (notes.includes('ai_assisted') || notes.includes('ai_suggested')) return 'ai_suggested';
  if (notes.includes('manual_ui') || notes.includes('manual')) return 'manual';
  return 'unknown';
}

function inferLaneFromNotes(notes: string | null): string | null {
  if (!notes) return null;
  const laneMatch = notes.match(/lane=([a-z_]+)/i);
  return laneMatch?.[1] ?? null;
}

function normalizeFilters(input: PortfolioFilterInput | undefined): PortfolioFilterState {
  return {
    view: input?.view === 'list' ? 'list' : 'grid',
    lane: input?.lane === 'current' ? 'current' : 'all',
    assetClass:
      input?.assetClass === 'stock' || input?.assetClass === 'etf' || input?.assetClass === 'crypto'
        ? input.assetClass
        : 'all',
    positionState:
      input?.positionState === 'open' || input?.positionState === 'closed'
        ? input.positionState
        : 'all',
  };
}

function computeAllocationItems(
  rows: PortfolioPositionItem[],
  keySelector: (row: PortfolioPositionItem) => string,
  labelSelector: (row: PortfolioPositionItem) => string,
): PortfolioAllocationItem[] {
  const totalValue = rows.reduce((sum, row) => sum + row.marketValue, 0);
  if (totalValue <= 0) {
    return [];
  }

  const byKey = new Map<string, { label: string; value: number }>();
  for (const row of rows) {
    const key = keySelector(row);
    const existing = byKey.get(key);
    if (existing) {
      byKey.set(key, { ...existing, value: existing.value + row.marketValue });
    } else {
      byKey.set(key, { label: labelSelector(row), value: row.marketValue });
    }
  }

  return [...byKey.entries()]
    .map(([key, value]) => ({
      key,
      label: value.label,
      value: value.value,
      percent: totalValue > 0 ? (value.value / totalValue) * 100 : 0,
    }))
    .sort((left, right) => right.value - left.value);
}

function mapPositionItems(
  rows: NonNullable<PortfolioReadModel['workstation']['workspace']>['positions'],
  readModel: PortfolioReadModel,
): PortfolioPositionItem[] {
  const portfolioValue = rows.reduce((sum, row) => sum + row.marketValue, 0);

  return rows.map((row) => {
    const asset = readModel.assetBySymbol.get(row.symbol);

    return {
      id: row.id,
      assetId: row.assetId,
      symbol: row.symbol,
      name: asset?.name ?? row.symbol,
      assetClass: row.assetClass,
      quantity: row.quantity,
      averageCost: row.averageCost,
      marketPrice: row.marketPrice,
      marketValue: row.marketValue,
      costBasis: row.costBasis,
      unrealizedPnl: row.unrealizedPnl,
      realizedPnl: row.realizedPnl,
      allocationPercent: portfolioValue > 0 ? (row.marketValue / portfolioValue) * 100 : 0,
      openedAt: row.openedAt,
      closedAt: row.closedAt,
      lastUpdatedAt: row.updatedAt,
      sparkline: readModel.sparklineBySymbol[row.symbol] ?? [],
      isWatched: readModel.watchedAssetIds.has(row.assetId),
    };
  });
}

function mapClosedPositionItems(
  rows: NonNullable<PortfolioReadModel['workstation']['workspace']>['closedPositions'],
  readModel: PortfolioReadModel,
): PortfolioPositionItem[] {
  return rows.map((row) => {
    const asset = readModel.assetBySymbol.get(row.symbol);

    return {
      id: row.id,
      assetId: row.assetId,
      symbol: row.symbol,
      name: asset?.name ?? row.symbol,
      assetClass: row.assetClass,
      quantity: row.quantity,
      averageCost: row.averageCost,
      marketPrice: row.marketPrice,
      marketValue: row.marketValue,
      costBasis: row.costBasis,
      unrealizedPnl: row.unrealizedPnl,
      realizedPnl: row.realizedPnl,
      allocationPercent: 0,
      openedAt: row.openedAt,
      closedAt: row.closedAt,
      lastUpdatedAt: row.updatedAt,
      sparkline: readModel.sparklineBySymbol[row.symbol] ?? [],
      isWatched: readModel.watchedAssetIds.has(row.assetId),
    };
  });
}

export function mapInvestPortfolioViewModel(
  readModel: PortfolioReadModel,
  rawFilters?: PortfolioFilterInput,
): InvestPortfolioViewModel {
  const filters = normalizeFilters(rawFilters);
  const workspace = readModel.workstation.workspace;

  if (!workspace) {
    return investPortfolioViewModelSchema.parse({
      status: toRouteStatus(readModel.workstation.workstationStatus),
      statusReason: readModel.workstation.statusMessage,
      sessionId: readModel.workstation.session?.id ?? null,
      laneId: readModel.workstation.session?.laneId ?? null,
      filters,
      summary: null,
      openPositions: [],
      closedPositions: [],
      recentTrades: [],
      allocationByAssetClass: [],
      allocationByAsset: [],
      watchlistCount: readModel.workstation.watchlist.length,
      emptyStateMessage: 'No simulation portfolio is active yet. Start a session to build positions.',
      asOf: new Date().toISOString(),
    });
  }

  const openPositions = mapPositionItems(workspace.positions, readModel);
  const closedPositions = mapClosedPositionItems(workspace.closedPositions, readModel);

  const filterByAssetClass = (item: PortfolioPositionItem) =>
    filters.assetClass === 'all' || item.assetClass === filters.assetClass;

  const filteredOpen = openPositions.filter(filterByAssetClass);
  const filteredClosed = closedPositions.filter(filterByAssetClass);

  const recentTrades = workspace.orders
    .filter((order) =>
      filters.lane === 'current'
        ? inferLaneFromNotes(order.notes) === (readModel.workstation.session?.laneId ?? null)
        : true,
    )
    .filter((order) => filterByAssetClass({
      id: order.id,
      assetId: order.assetId,
      symbol: order.symbol,
      name: order.symbol,
      assetClass: order.assetClass,
      quantity: order.quantity,
      averageCost: order.executedPrice,
      marketPrice: order.executedPrice,
      marketValue: order.grossAmount,
      costBasis: order.grossAmount,
      unrealizedPnl: 0,
      realizedPnl: order.realizedPnl,
      allocationPercent: 0,
      openedAt: null,
      closedAt: null,
      lastUpdatedAt: order.executedAt,
      sparkline: [],
      isWatched: false,
    }))
    .slice(0, 24)
    .map((order) => ({
      orderId: order.id,
      side: order.side,
      symbol: order.symbol,
      assetClass: order.assetClass,
      quantity: order.quantity,
      executedPrice: order.executedPrice,
      grossAmount: order.grossAmount,
      cashEffect: order.cashEffect,
      realizedPnl: order.realizedPnl,
      executedAt: order.executedAt,
      source: inferOrderSource(order.notes),
    }));

  return investPortfolioViewModelSchema.parse({
    status: toRouteStatus(readModel.workstation.workstationStatus),
    statusReason: readModel.workstation.statusMessage,
    sessionId: readModel.workstation.session?.id ?? null,
    laneId: readModel.workstation.session?.laneId ?? null,
    filters,
    summary: {
      equityValue: workspace.summary.equityValue,
      portfolioValue: workspace.summary.portfolioValue,
      cashBalance: workspace.summary.cashBalance,
      availableCash: workspace.summary.availableCash,
      buyingPower: workspace.summary.buyingPower,
      unrealizedPnl: workspace.summary.unrealizedPnl,
      realizedPnl: workspace.summary.realizedPnl,
      openPositionCount: workspace.summary.activeInvestmentCount,
      closedPositionCount: workspace.summary.closedInvestmentCount,
    },
    openPositions: filteredOpen,
    closedPositions: filteredClosed,
    recentTrades,
    allocationByAssetClass: computeAllocationItems(filteredOpen, (item) => item.assetClass, (item) => item.assetClass.toUpperCase()),
    allocationByAsset: computeAllocationItems(filteredOpen, (item) => item.symbol, (item) => item.symbol).slice(0, 12),
    watchlistCount: readModel.workstation.watchlist.length,
    emptyStateMessage:
      filteredOpen.length === 0 && filteredClosed.length === 0
        ? 'No positions match the current filters.'
        : null,
    asOf: new Date().toISOString(),
  });
}

