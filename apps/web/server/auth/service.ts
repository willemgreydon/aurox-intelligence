import {
  createSession,
  createUser,
  createVerificationToken,
  findUserByEmail,
  recordUserSignIn,
  resetPasswordFromToken,
  revokeSessionByToken,
  updateAuthUserPassword,
  verifyEmailFromToken,
} from '@repo/db';
import type { AccountUser } from '@repo/api-contracts';
import { hashPassword, verifyPassword } from './password';
import { getSessionExpiryDate, getVerificationTokenExpiry } from './config';
import { generateOpaqueToken } from './session-token';

type RequestMetadata = {
  userAgent?: string | null;
  ipAddress?: string | null;
};

export class AuthenticationError extends Error {
  constructor(
    message: string,
    readonly code:
      | 'invalid_credentials'
      | 'invalid_token'
      | 'account_disabled'
      | 'password_login_unavailable',
  ) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export type SessionEstablishmentResult = {
  user: AccountUser;
  sessionToken: string;
  sessionExpiresAt: Date;
};

export async function registerWithEmailPassword(
  input: {
    email: string;
    name: string;
    password: string;
  },
  metadata: RequestMetadata,
): Promise<SessionEstablishmentResult> {
  const user = await createUser({
    id: crypto.randomUUID(),
    email: input.email,
    displayName: input.name,
    passwordHash: await hashPassword(input.password),
    status: 'pending_verification',
  });

  await createVerificationToken({
    id: crypto.randomUUID(),
    userId: user.id,
    email: user.email,
    token: generateOpaqueToken(),
    type: 'email_verification',
    expiresAt: getVerificationTokenExpiry('email_verification').toISOString(),
  });

  return establishUserSession(user, metadata);
}

export async function loginWithEmailPassword(
  input: {
    email: string;
    password: string;
  },
  metadata: RequestMetadata,
): Promise<SessionEstablishmentResult> {
  const user = await findUserByEmail(input.email);

  if (!user) {
    throw new AuthenticationError('Invalid email or password.', 'invalid_credentials');
  }

  if (user.status === 'disabled') {
    throw new AuthenticationError('This account is disabled.', 'account_disabled');
  }

  if (!user.passwordHash) {
    throw new AuthenticationError(
      'Password login is not available for this account.',
      'password_login_unavailable',
    );
  }

  const passwordValid = await verifyPassword(input.password, user.passwordHash);

  if (!passwordValid) {
    throw new AuthenticationError('Invalid email or password.', 'invalid_credentials');
  }

  return establishUserSession(user, metadata);
}

export async function logoutWithSessionToken(token: string) {
  await revokeSessionByToken(token);
}

export async function requestPasswordReset(email: string) {
  const user = await findUserByEmail(email);

  if (!user || user.status === 'disabled') {
    return;
  }

  await createVerificationToken({
    id: crypto.randomUUID(),
    userId: user.id,
    email: user.email,
    token: generateOpaqueToken(),
    type: 'password_reset',
    expiresAt: getVerificationTokenExpiry('password_reset').toISOString(),
  });
}

export async function resetPasswordWithToken(token: string, password: string) {
  const passwordHash = await hashPassword(password);
  const user = await resetPasswordFromToken(token, passwordHash);

  if (!user) {
    throw new AuthenticationError('The password reset link is invalid or has expired.', 'invalid_token');
  }

  return user;
}

export async function verifyEmailWithToken(token: string) {
  const user = await verifyEmailFromToken(token);

  if (!user) {
    throw new AuthenticationError('The verification link is invalid or has expired.', 'invalid_token');
  }

  return user;
}

export async function createEmailVerificationForUser(user: AccountUser) {
  await createVerificationToken({
    id: crypto.randomUUID(),
    userId: user.id,
    email: user.email,
    token: generateOpaqueToken(),
    type: 'email_verification',
    expiresAt: getVerificationTokenExpiry('email_verification').toISOString(),
  });
}

export async function changePasswordForAuthenticatedUser(
  userId: string,
  nextPassword: string,
) {
  await updateAuthUserPassword(userId, await hashPassword(nextPassword));
}

async function establishUserSession(user: AccountUser, metadata: RequestMetadata) {
  const sessionToken = generateOpaqueToken();
  const sessionExpiresAt = getSessionExpiryDate();

  await recordUserSignIn(user.id);
  await createSession({
    id: crypto.randomUUID(),
    userId: user.id,
    token: sessionToken,
    expiresAt: sessionExpiresAt.toISOString(),
    userAgent: metadata.userAgent ?? null,
    ipAddress: metadata.ipAddress ?? null,
  });

  return {
    user,
    sessionToken,
    sessionExpiresAt,
  } satisfies SessionEstablishmentResult;
}
