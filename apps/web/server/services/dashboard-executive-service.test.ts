import { describe, expect, it, vi } from 'vitest';
import { dashboardKpiLinksAreInternal, getDashboardExecutiveViewModel } from './dashboard-executive-service';

vi.mock('./market-observation-service', () => ({
  getObserveViewModel: vi.fn(async () => ({
    generatedAt: new Date().toISOString(),
    degraded: false,
    summary: { regimeLabel: 'sideways', regimeConfidence: 0.5, criticalCount: 0, warningCount: 0, watchCount: 0, infoCount: 0 },
    regime: { label: 'sideways', confidence: 0.5, factors: [], updatedAt: new Date().toISOString(), explanation: 'n/a' },
    observerItems: [],
    timeline: [],
    anomalies: [],
    relationshipInsights: [],
    watchlistIntelligence: [],
    tradeReadiness: { symbol: null, result: null },
    persistenceDegraded: false,
  })),
}));

vi.mock('./alert-center-service', () => ({
  getAlertCenterViewModel: vi.fn(async () => ({
    generatedAt: new Date().toISOString(),
    degraded: false,
    summary: { open: 0, critical: 0, warning: 0, snoozed: 0, resolvedToday: 0 },
    grouped: { CRITICAL: [], WARNING: [], WATCH: [], INFO: [] },
    filters: { severity: 'all', category: 'all', assetClass: 'all', source: 'all', status: 'all', search: '' },
    persistenceDegraded: true,
  })),
}));

vi.mock('./portfolio-intelligence-service', () => ({
  getPortfolioIntelligenceViewModel: vi.fn(async () => ({
    intelligence: { diagnostics: { averageRiskScore: 0 } },
    brokerReadiness: { ready: true, summary: 'ok', liveAllowed: false },
    brokerPreviews: [],
    portfolioContext: {
      baseCurrency: 'EUR',
      cashBalance: 0,
      portfolioValue: 0,
      investedValue: 0,
      openPositionCount: 0,
      cashTargetRatio: null,
      state: 'cash-only',
      stateReason: 'n/a',
    },
    status: 'degraded',
    statusReason: 'n/a',
    simulationOnlyNotice: 'simulation',
  })),
}));

vi.mock('./news-service', () => ({
  getNewsStreamData: vi.fn(async () => ({ degraded: true, items: [] })),
}));

vi.mock('./admin-service', () => ({
  getAdminMonitoringData: vi.fn(async () => null),
}));

describe('dashboard-executive-service', () => {
  it('returns degraded-safe dashboard model', async () => {
    const model = await getDashboardExecutiveViewModel({ userId: 'u1' });
    expect(model.degraded).toBe(true);
    expect(model.kpis.length).toBeGreaterThan(0);
  });

  it('keeps KPI links internal', async () => {
    const model = await getDashboardExecutiveViewModel({ userId: 'u1' });
    expect(dashboardKpiLinksAreInternal(model)).toBe(true);
  });
});
