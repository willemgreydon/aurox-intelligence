import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

process.env.AUTH_SECRET = 'test-auth-secret-with-at-least-32-characters';
process.env.AUTH_SESSION_DAYS = '30';

const mockGetOptionalCurrentSession = vi.fn();
const mockGetSimulationJournalRowsForCurrentUser = vi.fn();

vi.mock('../../../../../server/auth/session', () => ({
  getOptionalCurrentSession: () => mockGetOptionalCurrentSession(),
  requireCurrentSession: () => { throw new Error('should not be called directly by route'); },
}));

vi.mock('../../../../../server/services/simulation-journal-service', () => ({
  getSimulationJournalRowsForCurrentUser: (...args: unknown[]) => mockGetSimulationJournalRowsForCurrentUser(...args),
  toCsv: (rows: unknown[]) => rows.map(() => 'row').join('\n'),
}));

const baseSession = {
  user: { id: 'user-1', email: 'user@example.com', name: 'Test', role: 'member' },
  sessionToken: 'token-123',
  expiresAt: new Date(Date.now() + 86400000).toISOString(),
};

describe('GET /api/invest/simulation/journal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockGetOptionalCurrentSession.mockResolvedValueOnce(null);

    const { GET } = await import('./route');
    const response = await GET(
      new NextRequest('http://localhost/api/invest/simulation/journal'),
    );

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toMatch(/authentication required/i);
  });

  it('returns CSV with 200 when authenticated', async () => {
    mockGetOptionalCurrentSession.mockResolvedValueOnce(baseSession);
    mockGetSimulationJournalRowsForCurrentUser.mockResolvedValueOnce([
      { id: '1', side: 'BUY', symbol: 'AAPL' },
    ]);

    const { GET } = await import('./route');
    const response = await GET(
      new NextRequest('http://localhost/api/invest/simulation/journal'),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/csv');
    expect(response.headers.get('content-disposition')).toContain('attachment');
  });

  it('does not call journal service when unauthenticated', async () => {
    mockGetOptionalCurrentSession.mockResolvedValueOnce(null);

    const { GET } = await import('./route');
    await GET(
      new NextRequest('http://localhost/api/invest/simulation/journal'),
    );

    expect(mockGetSimulationJournalRowsForCurrentUser).not.toHaveBeenCalled();
  });
});
