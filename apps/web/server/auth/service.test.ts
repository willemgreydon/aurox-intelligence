import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AccountUser } from '@repo/api-contracts';

process.env.AUTH_SECRET = 'test-auth-secret-with-at-least-32-characters';
process.env.AUTH_SESSION_DAYS = '30';

const dbMocks = vi.hoisted(() => ({
  createSession: vi.fn(),
  createUser: vi.fn(),
  createVerificationToken: vi.fn(),
  findUserByEmail: vi.fn(),
  resetPasswordFromToken: vi.fn(),
  revokeSessionByToken: vi.fn(),
  updateAuthUserPassword: vi.fn(),
  verifyEmailFromToken: vi.fn(),
}));

vi.mock('@repo/db', () => dbMocks);

const { loginWithEmailPassword, requestPasswordReset, resetPasswordWithToken, AuthenticationError } =
  await import('./service');

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
    ).rejects.toMatchObject<AuthenticationError>({
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
});
