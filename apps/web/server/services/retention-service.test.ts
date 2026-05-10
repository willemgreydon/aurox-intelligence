import { describe, expect, it, vi } from 'vitest';

const pruneObservationEventsMock = vi.fn();
const pruneResolvedAndDismissedAlertsMock = vi.fn();
const pruneAlertsMock = vi.fn();

vi.mock('@repo/db', () => ({
  pruneObservationEvents: (...args: unknown[]) => pruneObservationEventsMock(...args),
  pruneResolvedAndDismissedAlerts: (...args: unknown[]) => pruneResolvedAndDismissedAlertsMock(...args),
  pruneAlerts: (...args: unknown[]) => pruneAlertsMock(...args),
}));

describe('retention-service', () => {
  it('runs retention maintenance with defaults', async () => {
    const mod = await import('./retention-service');
    await mod.runRetentionMaintenance();
    expect(pruneObservationEventsMock).toHaveBeenCalledWith(30);
    expect(pruneResolvedAndDismissedAlertsMock).toHaveBeenCalledWith(30);
    expect(pruneAlertsMock).toHaveBeenCalledWith(120);
  });
});
