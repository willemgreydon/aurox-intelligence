import { describe, expect, it, vi } from 'vitest';

process.env.AUTH_SECRET = 'test-auth-secret-with-at-least-32-characters';
process.env.AUTH_SESSION_DAYS = '30';

const mockLoginWithEmailPassword = vi.fn();
const mockSetSessionCookie = vi.fn();

vi.mock('../../../../server/auth/service', () => ({
  loginWithEmailPassword: (...args: unknown[]) => mockLoginWithEmailPassword(...args),
  AuthenticationError: class AuthenticationError extends Error {
    constructor(message: string, readonly code: string) { super(message); }
  },
}));

vi.mock('../../../../server/auth/cookies', () => ({
  setSessionCookie: (...args: unknown[]) => mockSetSessionCookie(...args),
}));

const safeUser = {
  id: 'user-1',
  email: 'user@example.com',
  name: 'Test User',
  role: 'member',
  avatarUrl: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  passwordHash: 'scrypt:secret:hash',
  status: 'active',
};

describe('POST /api/auth/login', () => {
  it('returns 400 for missing credentials', async () => {
    const { POST } = await import('./route');
    const response = await POST(new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }));
    expect(response.status).toBe(400);
  });

  it('never returns passwordHash in response', async () => {
    mockLoginWithEmailPassword.mockResolvedValueOnce({
      user: safeUser,
      sessionToken: 'opaque-token-123',
      sessionExpiresAt: new Date(Date.now() + 86400000),
    });

    const { POST } = await import('./route');
    const response = await POST(new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'user@example.com', password: 'Password123' }),
    }));

    const body = await response.json();
    expect(body.user).toBeDefined();
    expect(body.user.passwordHash).toBeUndefined();
    expect(body.user.status).toBeUndefined();
    expect(body.user.id).toBe('user-1');
    expect(body.user.email).toBe('user@example.com');
  });

  it('returns 401 for invalid credentials', async () => {
    const { AuthenticationError } = await import('../../../../server/auth/service');
    mockLoginWithEmailPassword.mockRejectedValueOnce(
      new AuthenticationError('Invalid email or password.', 'invalid_credentials'),
    );

    const { POST } = await import('./route');
    const response = await POST(new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'user@example.com', password: 'wrong' }),
    }));

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('invalid_credentials');
  });

  it('returns 403 for disabled accounts', async () => {
    const { AuthenticationError } = await import('../../../../server/auth/service');
    mockLoginWithEmailPassword.mockRejectedValueOnce(
      new AuthenticationError('This account is disabled.', 'account_disabled'),
    );

    const { POST } = await import('./route');
    const response = await POST(new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'user@example.com', password: 'Password123' }),
    }));

    expect(response.status).toBe(403);
  });
});
