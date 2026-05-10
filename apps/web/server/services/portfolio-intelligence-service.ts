import {
  computePortfolioIntelligence,
  type PortfolioIntelligenceResult,
} from '@repo/ai-market-intelligence';
import type { Recommendation } from '@repo/ai-market-intelligence';
import {
  PreviewBroker,
  SimulatedBroker,
  evaluateBrokerDecision,
  type BrokerDecision,
  type BrokerPosition,
} from '@repo/agents';
import { getMarketIntelligenceWorkstationModel } from './market-intelligence-workstation-service';
import { getInvestPortfolioData } from './portfolio-service';
import { getOptionalCurrentSession } from '../auth/session';
import { getSimulationOverviewDataForUser } from './stock-simulation-service';
import { getNewsRiskSummary } from './news-intelligence-service';
import { getMacroIntelligenceViewModel } from './macro-intelligence-service';

export type PortfolioIntelligenceViewModel = {
  intelligence: PortfolioIntelligenceResult;
  brokerReadiness: {
    ready: boolean;
    summary: string;
    liveAllowed: false;
  };
  brokerPreviews: Array<{
    symbol: string;
    side: 'buy' | 'sell';
    decision: BrokerDecision;
  }>;
  portfolioContext: {
    baseCurrency: 'USD' | 'EUR';
    cashBalance: number;
    portfolioValue: number;
    investedValue: number;
    openPositionCount: number;
    cashTargetRatio: number | null;
    state: 'no-account' | 'cash-only' | 'no-positions' | 'stale-market-data' | 'active-portfolio' | 'insufficient-data';
    stateReason: string;
  };
  assetIdBySymbol: Record<string, string>;
  status: 'nominal' | 'degraded' | 'empty';
  statusReason: string;
  simulationOnlyNotice: string;
  newsExposure: {
    avgRisk: number;
    maxRisk: number;
    affectedAssets: string[];
  };
  macroContext: Awaited<ReturnType<typeof getMacroIntelligenceViewModel>>;
};

function mapAssetClassToAgents(
  assetClass: 'stock' | 'etf' | 'crypto' | 'index',
): 'stock' | 'etf' | 'crypto' | 'other' {
  if (assetClass === 'index') return 'other';
  return assetClass;
}

export async function getPortfolioIntelligenceViewModel(): Promise<PortfolioIntelligenceViewModel> {
  const SIMULATION_ONLY_NOTICE = 'Simulation only — no real capital deployed.';

  const [workstation, portfolioData, session, macroContext] = await Promise.all([
    getMarketIntelligenceWorkstationModel(),
    getInvestPortfolioData({ view: 'list', positionState: 'open', assetClass: 'all', lane: 'all' }),
    getOptionalCurrentSession(),
    getMacroIntelligenceViewModel(),
  ]);
  const newsExposure = await getNewsRiskSummary(portfolioData.openPositions.map((position) => position.assetId)).catch(() => ({
    avgRisk: 0,
    maxRisk: 0,
    affectedAssets: [] as string[],
  }));

  const overview = session ? await getSimulationOverviewDataForUser(session.user.id).catch(() => null) : null;
  const summary = overview?.summary;
  const cashBalance = summary?.cashBalance ?? portfolioData.summary?.cashBalance ?? 0;
  const investedValue = summary?.portfolioValue ?? portfolioData.summary?.portfolioValue ?? 0;
  const portfolioValue = summary?.equityValue ?? portfolioData.summary?.equityValue ?? (cashBalance + investedValue);
  const baseCurrency = (summary?.currency ?? 'EUR') as 'USD' | 'EUR';
  const openPositionCount = summary?.activeInvestmentCount ?? portfolioData.summary?.openPositionCount ?? portfolioData.openPositions.length;
  const quoteCoverage = workstation.assets.length > 0
    ? workstation.assets.filter((asset) => typeof asset.price === 'number' && Number.isFinite(asset.price) && asset.price > 0).length / workstation.assets.length
    : 0;
  const staleMarketData = workstation.assets.length > 0 && quoteCoverage < 0.5;
  const cashTargetRatio = portfolioValue > 0 ? cashBalance / portfolioValue : null;
  const state: PortfolioIntelligenceViewModel['portfolioContext']['state'] = !session
    ? 'no-account'
    : staleMarketData
      ? 'stale-market-data'
      : portfolioValue <= 0
        ? 'insufficient-data'
        : openPositionCount <= 0
          ? (cashBalance > 0 ? 'cash-only' : 'no-positions')
          : 'active-portfolio';
  const stateReason =
    state === 'no-account' ? 'No authenticated simulation account available.'
      : state === 'stale-market-data' ? 'Market data freshness is degraded; risk and valuation confidence are reduced.'
        : state === 'insufficient-data' ? 'Portfolio totals are unavailable from simulation snapshots.'
          : state === 'cash-only' ? 'Cash-only portfolio: no open simulated positions.'
            : state === 'no-positions' ? 'No open positions available for allocation analytics.'
              : 'Portfolio snapshot is active and consistent.';

  // Build current weights from open positions
  const currentWeightBySymbol = new Map<string, number>();
  if (portfolioData.summary && portfolioValue > 0) {
    for (const pos of portfolioData.openPositions) {
      const weight = (pos.marketValue ?? 0) / portfolioValue;
      currentWeightBySymbol.set(pos.symbol, weight);
    }
  }

  // Build broker positions from open positions
  const brokerPositions: BrokerPosition[] = portfolioData.openPositions.map((pos) => ({
    symbol: pos.symbol,
    quantity: pos.quantity,
    averageCost: pos.averageCost,
    currentValue: pos.marketValue,
    unrealizedPnl: pos.unrealizedPnl,
  }));

  // Extract recommendations from system state
  const systemState = workstation.systemState;
  const recsForEngine: Array<{
    symbol: string;
    assetClass?: 'stock' | 'etf' | 'crypto' | 'other';
    recommendation: Recommendation;
    currentWeight?: number;
  }> = systemState.recommendations.map(({ symbol, recommendation }) => {
    const asset = workstation.assets.find((a) => a.symbol === symbol);
    const assetClass = asset ? mapAssetClassToAgents(asset.assetClass) : 'stock';
    return {
      symbol,
      assetClass,
      recommendation,
      currentWeight: currentWeightBySymbol.get(symbol) ?? 0,
    };
  });

  if (recsForEngine.length === 0) {
    return {
      intelligence: computePortfolioIntelligence({ recommendations: [] }),
      brokerReadiness: { ready: false, summary: 'No recommendations available.', liveAllowed: false },
      brokerPreviews: [],
      portfolioContext: {
        baseCurrency,
        cashBalance,
        portfolioValue,
        investedValue,
        openPositionCount,
        cashTargetRatio,
        state,
        stateReason,
      },
      assetIdBySymbol: {},
      status: 'empty',
      statusReason: 'No market intelligence recommendations available to generate allocations.',
      simulationOnlyNotice: SIMULATION_ONLY_NOTICE,
      newsExposure,
      macroContext,
    };
  }

  // Compute portfolio intelligence (pure, no side effects)
  const intelligence = computePortfolioIntelligence({
    recommendations: recsForEngine,
    degraded: systemState.degraded,
    generatedAt: Date.now(),
  });

  // Build simulated broker for readiness + previews
  const simBroker = new SimulatedBroker(
    'portfolio-intelligence-preview',
    cashBalance,
    brokerPositions,
    portfolioValue,
  );
  const readiness = await simBroker.checkReadiness();

  // Build broker decision previews for top rebalance trades (max 5)
  const topTrades = intelligence.rebalancePlan.slice(0, 5);
  const previewBroker = new PreviewBroker(
    'portfolio-intelligence-preview',
    cashBalance,
    brokerPositions,
    portfolioValue,
  );

  const brokerPreviews = await Promise.all(
    topTrades.map(async (trade) => {
      const asset = workstation.assets.find((a) => a.symbol === trade.symbol);
      const marketPrice = (asset as { price?: number | null } | undefined)?.price ?? 0;
      const estimatedQty = portfolioValue > 0 && marketPrice > 0
        ? Math.floor((Math.abs(trade.targetWeightDelta) * portfolioValue) / marketPrice)
        : 1;

      const order = {
        symbol: trade.symbol,
        side: trade.side,
        quantity: Math.max(estimatedQty, 1),
        orderType: 'market' as const,
      };

      const decision = evaluateBrokerDecision({
        order,
        marketPrice: Math.max(marketPrice, 0.01),
        cashBalance,
        portfolioValue,
        openPositionCount: brokerPositions.length,
        newsRiskFlag: (systemState.assetStates.find((s) => s.symbol === trade.symbol)?.newsImpact?.riskFlag ?? 'LOW') as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
        liquidityScore: trade.symbol.includes('ETH') || trade.symbol.includes('BTC') ? 0.7 : 0.85,
        signalConfidence: recsForEngine.find((r) => r.symbol === trade.symbol)?.recommendation.confidence ?? 1,
        providerDegraded: systemState.degraded,
        readiness,
      });

      return { symbol: trade.symbol, side: trade.side, decision };
    }),
  );

  const status = systemState.degraded ? 'degraded' : 'nominal';

  return {
    intelligence,
    brokerReadiness: {
      ready: readiness.ready,
      summary: readiness.summary,
      liveAllowed: false,
    },
    brokerPreviews,
    portfolioContext: {
      baseCurrency,
      cashBalance,
      portfolioValue,
      investedValue,
      openPositionCount,
      cashTargetRatio,
      state,
      stateReason,
    },
    assetIdBySymbol: Object.fromEntries(workstation.assets.map((asset) => [asset.symbol, ''])),
    status,
    statusReason: systemState.degraded ? 'Market data is partially degraded. Allocations may be based on incomplete data.' : 'All systems nominal.',
    simulationOnlyNotice: SIMULATION_ONLY_NOTICE,
    newsExposure,
    macroContext,
  };
}

