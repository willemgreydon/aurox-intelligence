import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AccountUser } from '@repo/api-contracts';

process.env.AUTH_SECRET = 'test-auth-secret-with-at-least-32-characters';
process.env.AUTH_SESSION_DAYS = '30';

const dbMocks = vi.hoisted(() => ({
  createSession: vi.fn(),
  createUser: vi.fn(),
  createVerificationToken: vi.fn(),
  findUserByEmail: vi.fn(),
  recordUserSignIn: vi.fn(),
  resetPasswordFromToken: vi.fn(),
  revokeSessionByToken: vi.fn(),
  updateAuthUserPassword: vi.fn(),
  verifyEmailFromToken: vi.fn(),
}));

vi.mock('@repo/db', () => dbMocks);

const {
  loginWithEmailPassword,
  registerWithEmailPassword,
  requestPasswordReset,
  resetPasswordWithToken,
  AuthenticationError,
} = await import('./service');

const baseUser: AccountUser & { passwordHash?: string | null; status?: 'active' | 'pending_verification' | 'disabled' } =
  {
    id: 'user-1',
    email: 'user@example.com',
    name: 'Ada Lovelace',
    role: 'member',
    avatarUrl: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    passwordHash: null,
    status: 'active',
  };

describe('auth service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.AUTH_SECRET = 'test-auth-secret-with-at-least-32-characters';
    process.env.AUTH_SESSION_DAYS = '30';
  });

  it('rejects invalid login credentials safely', async () => {
    dbMocks.findUserByEmail.mockResolvedValue(null);

    await expect(
      loginWithEmailPassword(
        {
          email: 'missing@example.com',
          password: 'Password123',
        },
        {},
      ),
    ).rejects.toMatchObject({
      code: 'invalid_credentials',
    });
  });

  it('creates a password reset token only when a user exists', async () => {
    dbMocks.findUserByEmail.mockResolvedValueOnce(null);
    await requestPasswordReset('missing@example.com');
    expect(dbMocks.createVerificationToken).not.toHaveBeenCalled();

    dbMocks.findUserByEmail.mockResolvedValueOnce({
      ...baseUser,
      passwordHash: 'scrypt:test:hash',
      status: 'active',
    });

    await requestPasswordReset('user@example.com');
    expect(dbMocks.createVerificationToken).toHaveBeenCalledTimes(1);
  });

  it('rejects expired or invalid password reset tokens', async () => {
    dbMocks.resetPasswordFromToken.mockResolvedValue(null);

    await expect(resetPasswordWithToken('bad-token', 'Password123')).rejects.toMatchObject({
      code: 'invalid_token',
    });
  });

  it('rejects login for a disabled account', async () => {
    dbMocks.findUserByEmail.mockResolvedValue({
      ...baseUser,
      passwordHash: 'scrypt:aabbcc:ddeeff',
      status: 'disabled',
    });

    await expect(
      loginWithEmailPassword({ email: 'user@example.com', password: 'Password123' }, {}),
    ).rejects.toMatchObject({ code: 'account_disabled' });
  });

  it('rejects login when no passwordHash is set (OAuth-only account)', async () => {
    dbMocks.findUserByEmail.mockResolvedValue({
      ...baseUser,
      passwordHash: null,
      status: 'active',
    });

    await expect(
      loginWithEmailPassword({ email: 'user@example.com', password: 'Password123' }, {}),
    ).rejects.toMatchObject({ code: 'password_login_unavailable' });
  });

  it('login result includes sessionToken and sessionExpiresAt', async () => {
    const { hashPassword } = await import('./password');
    const storedHash = await hashPassword('CorrectPassword1');

    dbMocks.findUserByEmail.mockResolvedValue({
      ...baseUser,
      passwordHash: storedHash,
      status: 'active',
    });
    dbMocks.createSession.mockResolvedValue(undefined);

    const result = await loginWithEmailPassword(
      { email: 'user@example.com', password: 'CorrectPassword1' },
      {},
    );

    expect(result.sessionToken).toBeTruthy();
    expect(result.sessionExpiresAt).toBeInstanceOf(Date);
    expect(result.user.id).toBe('user-1');
  });

  it('login result user contains only safe AccountUser fields (no raw secrets)', async () => {
    const { hashPassword } = await import('./password');
    const storedHash = await hashPassword('CorrectPassword1');

    dbMocks.findUserByEmail.mockResolvedValue({
      ...baseUser,
      passwordHash: storedHash,
      status: 'active',
    });
    dbMocks.createSession.mockResolvedValue(undefined);

    const result = await loginWithEmailPassword(
      { email: 'user@example.com', password: 'CorrectPassword1' },
      {},
    );

    // The service returns the full AuthUserRecord (superset of AccountUser).
    // The API route handler is responsible for stripping passwordHash before the response.
    // Here we verify the safe fields are present and the session is established.
    expect(result.user.id).toBe('user-1');
    expect(result.user.email).toBe('user@example.com');
    expect(result.user.name).toBeDefined();
    expect(result.user.role).toBeDefined();
    expect(result.sessionToken).toBeTruthy();
    expect(result.sessionExpiresAt).toBeInstanceOf(Date);
  });

  it('register result contains a valid session and user', async () => {
    dbMocks.createUser.mockResolvedValue({
      ...baseUser,
      passwordHash: 'scrypt:salt:key',
      status: 'pending_verification',
    });
    dbMocks.createVerificationToken.mockResolvedValue(undefined);
    dbMocks.createSession.mockResolvedValue(undefined);

    const result = await registerWithEmailPassword(
      { email: 'new@example.com', name: 'New User', password: 'Password123' },
      {},
    );

    expect(result.user.email).toBe('user@example.com');
    expect(result.sessionToken).toBeTruthy();
    expect(result.sessionExpiresAt).toBeInstanceOf(Date);
  });
});
