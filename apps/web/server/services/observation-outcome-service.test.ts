import { describe, expect, it, vi } from 'vitest';
import { getObservationOutcome } from './observation-outcome-service';

const listSimulatedOrdersForUserMock = vi.fn();

vi.mock('@repo/db', () => ({
  listSimulatedOrdersForUser: (...args: unknown[]) => listSimulatedOrdersForUserMock(...args),
}));

describe('observation-outcome-service', () => {
  it('returns pending when no related order exists', async () => {
    const result = await getObservationOutcome({ userId: 'u1', relatedOrderId: null });
    expect(result.outcomeStatus).toBe('PENDING');
  });

  it('returns win/loss style outcome with roi when order exists', async () => {
    listSimulatedOrdersForUserMock.mockResolvedValue([
      { id: 'o1', grossAmount: 1000, realizedPnl: 50 },
    ]);
    const result = await getObservationOutcome({ userId: 'u1', relatedOrderId: 'o1', signalDirection: 'BUY' });
    expect(result.outcomeStatus).toBe('WIN');
    expect(result.roiPercent).toBeCloseTo(5, 6);
  });
});
