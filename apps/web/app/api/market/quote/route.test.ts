import { describe, expect, it, vi } from 'vitest';

const loadQuoteSnapshotsMock = vi.fn();

vi.mock('../../../../server/services/stock-simulation-service', () => ({
  loadQuoteSnapshots: (...args: unknown[]) => loadQuoteSnapshotsMock(...args),
}));

describe('GET /api/market/quote', () => {
  it('validates required symbol', async () => {
    const { GET } = await import('./route');
    const response = await GET(new Request('http://localhost/api/market/quote'));
    expect(response.status).toBe(400);
  });

  it('returns quote payload for valid symbol', async () => {
    loadQuoteSnapshotsMock.mockResolvedValueOnce([
      { symbol: 'AAPL', price: 100, changePercent: 1.2 },
    ]);
    const { GET } = await import('./route');
    const response = await GET(new Request('http://localhost/api/market/quote?symbol=AAPL&assetClass=stock'));
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.quote.symbol).toBe('AAPL');
  });

  it('is accessible without authentication (intentionally public market data endpoint)', async () => {
    loadQuoteSnapshotsMock.mockResolvedValueOnce([{ symbol: 'MSFT', price: 380 }]);
    const { GET } = await import('./route');
    // No auth cookie — must still return 200, not 401
    const response = await GET(new Request('http://localhost/api/market/quote?symbol=MSFT'));
    expect(response.status).not.toBe(401);
    expect(response.status).not.toBe(403);
  });

  it('never exposes user-specific or sensitive fields in response', async () => {
    loadQuoteSnapshotsMock.mockResolvedValueOnce([{ symbol: 'AAPL', price: 182.34 }]);
    const { GET } = await import('./route');
    const response = await GET(new Request('http://localhost/api/market/quote?symbol=AAPL&assetClass=stock'));
    const body = await response.json();
    expect(body.user).toBeUndefined();
    expect(body.session).toBeUndefined();
    expect(body.passwordHash).toBeUndefined();
  });

  it('returns 404 when no quote is found', async () => {
    loadQuoteSnapshotsMock.mockResolvedValueOnce([]);
    const { GET } = await import('./route');
    const response = await GET(new Request('http://localhost/api/market/quote?symbol=UNKNOWN'));
    expect(response.status).toBe(404);
  });
});

