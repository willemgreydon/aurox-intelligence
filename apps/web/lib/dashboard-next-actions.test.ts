import { describe, expect, it } from 'vitest';
import { computeNextBestActions, type NextActionInput } from './dashboard-next-actions';

const base: NextActionInput = {
  hasTrades: true,
  totalTrades: 5,
  journalCoverageRatio: 1,
  concentrationLevel: 'low',
  largestPositionLabel: 'AMD · 20%',
  cashDeploymentRatio: 0.4,
  watchlistCount: 0,
  staleData: false,
  openPositions: 3,
};

describe('computeNextBestActions', () => {
  it('leads with "first paper trade" for an empty account', () => {
    const actions = computeNextBestActions({ ...base, hasTrades: false, totalTrades: 0, journalCoverageRatio: null, openPositions: 0 });
    expect(actions[0]?.id).toBe('first-trade');
    expect(actions[0]?.tone).toBe('primary');
  });

  it('surfaces stale-data and concentration in priority order', () => {
    const actions = computeNextBestActions({
      ...base,
      staleData: true,
      concentrationLevel: 'high',
    });
    const ids = actions.map((a) => a.id);
    expect(ids.indexOf('stale-data')).toBeLessThan(ids.indexOf('concentration'));
    const conc = actions.find((a) => a.id === 'concentration');
    expect(conc?.detail).toContain('AMD');
  });

  it('flags low journal coverage only with enough trades', () => {
    const low = computeNextBestActions({ ...base, journalCoverageRatio: 0.2 });
    expect(low.some((a) => a.id === 'journal-coverage')).toBe(true);
    const fewTrades = computeNextBestActions({ ...base, totalTrades: 2, journalCoverageRatio: 0.2 });
    expect(fewTrades.some((a) => a.id === 'journal-coverage')).toBe(false);
  });

  it('flags high cash deployment only with open positions', () => {
    const deployed = computeNextBestActions({ ...base, cashDeploymentRatio: 0.95 });
    expect(deployed.some((a) => a.id === 'cash-deployment')).toBe(true);
    const noPos = computeNextBestActions({ ...base, cashDeploymentRatio: 0.95, openPositions: 0 });
    expect(noPos.some((a) => a.id === 'cash-deployment')).toBe(false);
  });

  it('suggests reviewing watchlist when present', () => {
    const actions = computeNextBestActions({ ...base, watchlistCount: 4 });
    const w = actions.find((a) => a.id === 'review-watchlist');
    expect(w?.detail).toContain('4 assets');
  });

  it('falls back to a generic performance review when nothing else applies', () => {
    const actions = computeNextBestActions(base);
    expect(actions).toHaveLength(1);
    expect(actions[0]?.id).toBe('review-performance');
  });

  it('uses non-advisory review/inspect language only', () => {
    const actions = computeNextBestActions({ ...base, staleData: true, concentrationLevel: 'high', journalCoverageRatio: 0.1, watchlistCount: 2 });
    const text = actions.map((a) => `${a.title} ${a.detail}`).join(' ').toLowerCase();
    expect(text).not.toMatch(/guaranteed|buy now|will profit|risk-free/);
  });
});
