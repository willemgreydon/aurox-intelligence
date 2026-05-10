import { describe, expect, it, vi, beforeEach } from 'vitest';

process.env.AUTH_SECRET = 'test-auth-secret-with-at-least-32-characters';
process.env.AUTH_SESSION_DAYS = '30';

const mockRequireCurrentSession = vi.fn();
const mockUpdateAlertInteraction = vi.fn();
const mockRevalidateForAlertState = vi.fn();

vi.mock('../../../../../server/auth/session', () => ({
  requireCurrentSession: (...args: unknown[]) => mockRequireCurrentSession(...args),
}));

vi.mock('../../../../../server/services/alert-center-service', () => ({
  updateAlertInteraction: (...args: unknown[]) => mockUpdateAlertInteraction(...args),
}));

vi.mock('../../../../../server/lib/revalidation-targets', () => ({
  revalidateForAlertState: () => mockRevalidateForAlertState(),
}));

const baseSession = {
  user: { id: 'user-1', email: 'user@example.com', name: 'Test', role: 'member' },
};

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/alerts/alert-123/state', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const context = { params: Promise.resolve({ id: 'alert-123' }) };

describe('POST /api/alerts/[id]/state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws redirect (requires session) when not authenticated', async () => {
    // requireCurrentSession throws a redirect when no session — the route does not return 401,
    // it propagates the redirect exception from the session layer.
    mockRequireCurrentSession.mockRejectedValueOnce(new Error('NEXT_REDIRECT'));

    const { POST } = await import('./route');
    await expect(POST(makeRequest({ action: 'read' }), context)).rejects.toThrow('NEXT_REDIRECT');
  });

  it('returns 400 when action is missing', async () => {
    mockRequireCurrentSession.mockResolvedValueOnce(baseSession);

    const { POST } = await import('./route');
    const response = await POST(makeRequest({}), context);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.ok).toBe(false);
  });

  it('returns 200 and calls updateAlertInteraction with correct userId', async () => {
    mockRequireCurrentSession.mockResolvedValueOnce(baseSession);
    mockUpdateAlertInteraction.mockResolvedValueOnce(undefined);

    const { POST } = await import('./route');
    const response = await POST(makeRequest({ action: 'read' }), context);

    expect(response.status).toBe(200);
    expect(mockUpdateAlertInteraction).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1', alertId: 'alert-123', action: 'read' }),
    );
    const body = await response.json();
    expect(body.ok).toBe(true);
  });

  it('scopes alert interaction to the authenticated user id', async () => {
    const differentUser = { user: { id: 'user-99', email: 'other@example.com', role: 'member' } };
    mockRequireCurrentSession.mockResolvedValueOnce(differentUser);
    mockUpdateAlertInteraction.mockResolvedValueOnce(undefined);

    const { POST } = await import('./route');
    await POST(makeRequest({ action: 'dismiss' }), context);

    // Interaction is scoped to the session user — not to an arbitrary user from the request body
    expect(mockUpdateAlertInteraction).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-99' }),
    );
  });
});
