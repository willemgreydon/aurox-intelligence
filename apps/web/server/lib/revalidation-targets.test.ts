import { describe, expect, it, vi, beforeEach } from 'vitest';

const revalidatePathMock = vi.fn();

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => revalidatePathMock(...args),
}));

describe('revalidation-targets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('revalidates targeted simulation order paths', async () => {
    const mod = await import('./revalidation-targets');
    mod.revalidateForSimulationOrder({ symbol: 'AMD', assetClass: 'stock' });
    expect(revalidatePathMock).toHaveBeenCalledWith('/invest/simulation');
    expect(revalidatePathMock).toHaveBeenCalledWith('/portfolio/intelligence');
    expect(revalidatePathMock).toHaveBeenCalledWith('/stocks/AMD');
  });

  it('revalidates alert and observe for alert state changes', async () => {
    const mod = await import('./revalidation-targets');
    mod.revalidateForAlertState();
    expect(revalidatePathMock).toHaveBeenCalledWith('/alerts');
    expect(revalidatePathMock).toHaveBeenCalledWith('/observe');
  });
});
