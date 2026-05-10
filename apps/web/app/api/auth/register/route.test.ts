import { describe, expect, it, vi } from 'vitest';

process.env.AUTH_SECRET = 'test-auth-secret-with-at-least-32-characters';
process.env.AUTH_SESSION_DAYS = '30';

const mockRegisterWithEmailPassword = vi.fn();
const mockSetSessionCookie = vi.fn();

vi.mock('../../../../server/auth/service', () => ({
  registerWithEmailPassword: (...args: unknown[]) => mockRegisterWithEmailPassword(...args),
}));

vi.mock('../../../../server/auth/cookies', () => ({
  setSessionCookie: (...args: unknown[]) => mockSetSessionCookie(...args),
}));

vi.mock('@repo/db', () => ({
  EmailAlreadyInUseError: class EmailAlreadyInUseError extends Error {},
}));

const safeUser = {
  id: 'user-new',
  email: 'new@example.com',
  name: 'New User',
  role: 'member',
  avatarUrl: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  passwordHash: 'scrypt:secret:hash',
  status: 'pending_verification',
};

describe('POST /api/auth/register', () => {
  it('returns 400 for incomplete input', async () => {
    const { POST } = await import('./route');
    const response = await POST(new Request('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@test.com' }),
    }));
    expect(response.status).toBe(400);
  });

  it('returns 201 with safe user on successful registration', async () => {
    mockRegisterWithEmailPassword.mockResolvedValueOnce({
      user: safeUser,
      sessionToken: 'opaque-token-456',
      sessionExpiresAt: new Date(Date.now() + 86400000),
    });

    const { POST } = await import('./route');
    const response = await POST(new Request('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'new@example.com',
        name: 'New User',
        password: 'Password123!',
        confirmPassword: 'Password123!',
      }),
    }));

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.user).toBeDefined();
    expect(body.user.passwordHash).toBeUndefined();
    expect(body.user.status).toBeUndefined();
    expect(body.user.id).toBe('user-new');
    expect(body.user.email).toBe('new@example.com');
    expect(body.session.expiresAt).toBeDefined();
  });

  it('returns 409 when email is already in use', async () => {
    const { EmailAlreadyInUseError } = await import('@repo/db');
    mockRegisterWithEmailPassword.mockRejectedValueOnce(new EmailAlreadyInUseError('Email in use'));

    const { POST } = await import('./route');
    const response = await POST(new Request('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'existing@example.com',
        name: 'User',
        password: 'Password123!',
        confirmPassword: 'Password123!',
      }),
    }));

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error).toBe('email_in_use');
  });

  it('passwords must match (confirm password validation)', async () => {
    const { POST } = await import('./route');
    const response = await POST(new Request('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'new@example.com',
        name: 'New User',
        password: 'Password123!',
        confirmPassword: 'DifferentPassword!',
      }),
    }));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.fieldErrors?.confirmPassword).toBeDefined();
  });
});
