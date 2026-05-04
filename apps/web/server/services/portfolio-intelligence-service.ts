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
    cashBalance: number;
    portfolioValue: number;
    openPositionCount: number;
  };
  status: 'nominal' | 'degraded' | 'empty';
  statusReason: string;
  simulationOnlyNotice: string;
};

function mapAssetClassToAgents(
  assetClass: 'stock' | 'etf' | 'crypto' | 'index',
): 'stock' | 'etf' | 'crypto' | 'other' {
  if (assetClass === 'index') return 'other';
  return assetClass;
}

export async function getPortfolioIntelligenceViewModel(): Promise<PortfolioIntelligenceViewModel> {
  const SIMULATION_ONLY_NOTICE = 'Simulation only — no real capital deployed.';

  const [workstation, portfolioData] = await Promise.all([
    getMarketIntelligenceWorkstationModel(),
    getInvestPortfolioData({ view: 'list', positionState: 'open', assetClass: 'all', lane: 'all' }),
  ]);

  const cashBalance = portfolioData.summary?.cashBalance ?? 0;
  const portfolioValue = portfolioData.summary?.equityValue ?? 0;

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
      portfolioContext: { cashBalance, portfolioValue, openPositionCount: brokerPositions.length },
      status: 'empty',
      statusReason: 'No market intelligence recommendations available to generate allocations.',
      simulationOnlyNotice: SIMULATION_ONLY_NOTICE,
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
        newsRiskFlag: (systemState.assetStates.find((s) => s.symbol === trade.symbol)?.newsImpact.riskFlag ?? 'LOW') as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
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
      cashBalance,
      portfolioValue,
      openPositionCount: brokerPositions.length,
    },
    status,
    statusReason: systemState.degraded ? 'Market data is partially degraded. Allocations may be based on incomplete data.' : 'All systems nominal.',
    simulationOnlyNotice: SIMULATION_ONLY_NOTICE,
  };
}
