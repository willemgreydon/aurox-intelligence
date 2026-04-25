import { beforeEach, describe, expect, it, vi } from 'vitest';
import { assertSimulationSessionAllowsTradingForCurrentUser } from './simulation-workstation-service';

const requireCurrentSessionMock = vi.fn();
const getPreferredSimulationSessionForUserMock = vi.fn();

vi.mock('../auth/session', () => ({
  requireCurrentSession: (...args: unknown[]) => requireCurrentSessionMock(...args),
}));

vi.mock('@repo/db', () => ({
  getPreferredSimulationSessionForUser: (...args: unknown[]) =>
    getPreferredSimulationSessionForUserMock(...args),
  getSimulationWorkspace: vi.fn(),
  getSimulationWorkspaceIfExists: vi.fn(),
  getUserWatchlist: vi.fn(),
  listSimulationTradableAssets: vi.fn(),
  markSimulationSessionOpened: vi.fn(),
  startOrResumeSimulationSession: vi.fn(),
}));

describe('assertSimulationSessionAllowsTradingForCurrentUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireCurrentSessionMock.mockResolvedValue({ user: { id: 'user-1' } });
  });

  it('rejects read-only sessions', async () => {
    getPreferredSimulationSessionForUserMock.mockResolvedValue({
      id: 'session-1',
      laneId: 'manual_multi_asset_lane',
      laneMode: 'manual',
      status: 'running',
      observationStatus: 'degraded',
      observationMessage: 'Observation feed is stale; workstation is read-only until freshness recovers.',
      assetScope: 'multi-asset',
      maxCapitalUsd: 100000,
      microAllocationPercent: 0,
      decisionSource: 'manual_ui',
      lastHeartbeatAt: null,
      startedAt: null,
      pausedAt: null,
      stoppedAt: null,
      completedAt: null,
      failedAt: null,
      lastError: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastOpenedAt: null,
    });

    await expect(assertSimulationSessionAllowsTradingForCurrentUser()).rejects.toThrow('read-only');
  });

  it('returns running healthy sessions', async () => {
    const session = {
      id: 'session-1',
      laneId: 'manual_multi_asset_lane',
      laneMode: 'manual',
      status: 'running',
      observationStatus: 'watching',
      observationMessage: 'Observation feed is healthy.',
      assetScope: 'multi-asset',
      maxCapitalUsd: 100000,
      microAllocationPercent: 0,
      decisionSource: 'manual_ui',
      lastHeartbeatAt: null,
      startedAt: null,
      pausedAt: null,
      stoppedAt: null,
      completedAt: null,
      failedAt: null,
      lastError: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastOpenedAt: null,
    };
    getPreferredSimulationSessionForUserMock.mockResolvedValue(session);

    await expect(assertSimulationSessionAllowsTradingForCurrentUser()).resolves.toEqual(session);
  });
});
