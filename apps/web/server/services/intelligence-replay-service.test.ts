import { describe, expect, it, vi } from 'vitest';
import { getIntelligenceReplayModel } from './intelligence-replay-service';

vi.mock('@repo/db', () => ({
  getAlert: vi.fn(),
  getObservationEvent: vi.fn(),
}));

vi.mock('./observation-outcome-service', () => ({
  getObservationOutcome: vi.fn(async () => ({
    outcomeStatus: 'UNAVAILABLE',
    roiPercent: null,
    pnlAmount: null,
    timeHorizon: null,
    predictionAccuracy: null,
    explanation: ['No outcome'],
  })),
}));

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

import { getAlert, getObservationEvent } from '@repo/db';
import { getObservationOutcome } from './observation-outcome-service';

describe('intelligence-replay-service', () => {
  it('returns null when no alert or observation exists', async () => {
    vi.mocked(getAlert).mockResolvedValue(null as never);
    vi.mocked(getObservationEvent).mockResolvedValue(null as never);
    const result = await getIntelligenceReplayModel({ replayId: 'missing', userId: 'u1' });
    expect(result).toBeNull();
  });

  it('returns replay model with missing-data notes when partial data exists', async () => {
    vi.mocked(getAlert).mockResolvedValue({
      id: 'a1',
      observationEventId: null,
      workspaceId: null,
      userId: 'u1',
      assetId: null,
      symbol: null,
      source: 'risk',
      category: 'portfolio',
      severity: 'WARNING',
      title: 'Risk warning',
      description: 'risk raised',
      confidence: 0.6,
      score: 55,
      status: 'OPEN',
      dedupeKey: 'k',
      cooldownBucket: 'b',
      metadata: {},
      firstSeenAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as never);
    vi.mocked(getObservationEvent).mockResolvedValue(null as never);
    const result = await getIntelligenceReplayModel({ replayId: 'a1', userId: 'u1' });
    expect(result).not.toBeNull();
    expect(result?.missingData.length).toBeGreaterThan(0);
  });

  it('joins simulated outcome fixture when available', async () => {
    vi.mocked(getAlert).mockResolvedValue({
      id: 'a2',
      observationEventId: null,
      workspaceId: null,
      userId: 'u1',
      assetId: null,
      symbol: 'BTC',
      assetClass: 'crypto',
      source: 'simulation',
      category: 'simulation',
      severity: 'INFO',
      title: 'Simulation update',
      description: 'order outcome available',
      confidence: 0.7,
      score: 30,
      status: 'OPEN',
      dedupeKey: 'k2',
      cooldownBucket: 'b2',
      metadata: { relatedOrderId: 'o1' },
      firstSeenAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as never);
    vi.mocked(getObservationEvent).mockResolvedValue(null as never);
    vi.mocked(getObservationOutcome).mockResolvedValue({
      outcomeStatus: 'WIN',
      roiPercent: 8.2,
      pnlAmount: 12.4,
      timeHorizon: 'executed_order',
      predictionAccuracy: 1,
      explanation: ['Outcome computed from simulated order.'],
    });
    const result = await getIntelligenceReplayModel({ replayId: 'a2', userId: 'u1' });
    expect(result?.outcomeContext?.status).toBe('WIN');
    expect(result?.outcomeContext?.roiPercent).toBe(8.2);
  });
});
