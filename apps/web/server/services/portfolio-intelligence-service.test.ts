import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getPortfolioIntelligenceViewModel } from './portfolio-intelligence-service';

const getMarketIntelligenceWorkstationModelMock = vi.fn();
const getInvestPortfolioDataMock = vi.fn();
const computePortfolioIntelligenceMock = vi.fn();
const evaluateBrokerDecisionMock = vi.fn();
const checkReadinessMock = vi.fn();

// Auth session must be mocked before the service module is loaded — the
// transitive import chain (portfolio-intelligence-service → session → auth/config)
// throws a Zod validation error when AUTH_SECRET is not set in the test env.
vi.mock('../auth/session', () => ({
  getOptionalCurrentSession: () => Promise.resolve(null),
}));

// Stub the simulation overview so the null-session fast-path is exercised cleanly.
vi.mock('./stock-simulation-service', () => ({
  getSimulationOverviewDataForUser: () => Promise.resolve(null),
}));

// Stub news risk summary — not relevant to intelligence logic being tested.
vi.mock('./news-intelligence-service', () => ({
  getNewsRiskSummary: () => Promise.resolve({ avgRisk: 0, maxRisk: 0, affectedAssets: [] }),
}));

vi.mock('./market-intelligence-workstation-service', () => ({
  getMarketIntelligenceWorkstationModel: (...args: unknown[]) =>
    getMarketIntelligenceWorkstationModelMock(...args),
}));

vi.mock('./portfolio-service', () => ({
  getInvestPortfolioData: (...args: unknown[]) => getInvestPortfolioDataMock(...args),
}));

vi.mock('@repo/ai-market-intelligence', () => ({
  computePortfolioIntelligence: (...args: unknown[]) => computePortfolioIntelligenceMock(...args),
}));

vi.mock('@repo/agents', () => ({
  SimulatedBroker: class {
    async checkReadiness() {
      return checkReadinessMock();
    }
  },
  PreviewBroker: class {},
  evaluateBrokerDecision: (...args: unknown[]) => evaluateBrokerDecisionMock(...args),
}));

describe('getPortfolioIntelligenceViewModel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checkReadinessMock.mockResolvedValue({ ready: true, summary: 'Simulation broker ready' });
    evaluateBrokerDecisionMock.mockReturnValue({
      simulationOnly: true,
      liveAllowed: false,
      executable: true,
      readinessScore: 0.8,
      slippageEstimate: 0.001,
      feeEstimate: 0,
      spreadEstimate: 0.001,
      warnings: [],
      blockedReasons: [],
      nextBestAction: 'simulate',
      explanation: 'ok',
      confidence: 0.8,
    });
  });

  it('returns empty-safe state with simulation-only notice when recommendations are missing', async () => {
    getMarketIntelligenceWorkstationModelMock.mockResolvedValue({
      systemState: { recommendations: [], degraded: false, assetStates: [] },
      assets: [],
    });
    getInvestPortfolioDataMock.mockResolvedValue({
      summary: null,
      openPositions: [],
    });
    computePortfolioIntelligenceMock.mockReturnValue({
      allocations: [],
      ranking: [],
      rebalancePlan: [],
      diagnostics: {},
      regime: {},
      summary: {},
      explanation: 'empty',
    });

    const vm = await getPortfolioIntelligenceViewModel();

    expect(vm.status).toBe('empty');
    expect(vm.brokerReadiness.liveAllowed).toBe(false);
    expect(vm.simulationOnlyNotice).toContain('Simulation only');
  });

  it('handles degraded mode and partial v2 asset fields without crashing', async () => {
    getMarketIntelligenceWorkstationModelMock.mockResolvedValue({
      systemState: {
        degraded: true,
        recommendations: [
          {
            symbol: 'AAPL',
            recommendation: { confidence: 0.7 },
          },
        ],
        assetStates: [
          {
            symbol: 'AAPL',
          },
        ],
      },
      assets: [{ symbol: 'AAPL', assetClass: 'stock', price: null }],
    });

    getInvestPortfolioDataMock.mockResolvedValue({
      summary: { cashBalance: 1000, equityValue: 10000 },
      openPositions: [],
    });

    computePortfolioIntelligenceMock.mockReturnValue({
      allocations: [],
      ranking: [],
      rebalancePlan: [
        {
          symbol: 'AAPL',
          side: 'buy',
          targetWeightDelta: 0.1,
          estimatedNotionalPct: 10,
          reasoning: 'Rebalance toward target',
        },
      ],
      diagnostics: {},
      regime: {},
      summary: {},
      explanation: 'degraded',
    });

    const vm = await getPortfolioIntelligenceViewModel();

    expect(vm.status).toBe('degraded');
    expect(vm.statusReason.toLowerCase()).toContain('degraded');
    expect(vm.simulationOnlyNotice).toContain('Simulation only');
    expect(vm.brokerReadiness.liveAllowed).toBe(false);
    expect(vm.brokerPreviews).toHaveLength(1);
    expect(vm.brokerPreviews[0]?.decision.liveAllowed).toBe(false);
  });
});

