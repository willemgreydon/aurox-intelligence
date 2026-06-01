import { z } from 'zod';

const authEnvSchema = z.object({
  AUTH_SECRET: z.string().trim().min(32, 'AUTH_SECRET must be at least 32 characters.'),
  AUTH_SESSION_DAYS: z.coerce.number().int().min(1).max(90).default(30),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

const parsedAuthEnv = authEnvSchema.safeParse({
  AUTH_SECRET: process.env.AUTH_SECRET,
  AUTH_SESSION_DAYS: process.env.AUTH_SESSION_DAYS,
  NODE_ENV: process.env.NODE_ENV ?? 'development',
});

if (!parsedAuthEnv.success) {
  // Surface a clear, actionable message instead of a raw ZodError stack.
  // We intentionally never fall back to a default AUTH_SECRET — a weak or
  // shared signing key would silently compromise every session token.
  // We never log the value itself, only which variables failed validation.
  const fieldErrors = parsedAuthEnv.error.flatten().fieldErrors;
  const issues = Object.entries(fieldErrors)
    .map(([key, messages]) => `  - ${key}: ${(messages ?? []).join(', ')}`)
    .join('\n');

  throw new Error(
    [
      'Invalid or missing authentication environment configuration.',
      issues,
      '',
      'AUTH_SECRET is required and must be at least 32 characters.',
      'For local development, set it in the repository root `.env` (preferred)',
      'or in apps/web/.env.local.',
      '',
      'Generate a strong value with:',
      '  openssl rand -base64 32',
      '',
      'Then run `pnpm env:check` to confirm it is visible to the app.',
    ].join('\n'),
  );
}

const authEnv = parsedAuthEnv.data;

export function getAuthSecret() {
  return authEnv.AUTH_SECRET;
}

export function getSessionDurationDays() {
  return authEnv.AUTH_SESSION_DAYS;
}

export function getSessionExpiryDate() {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + getSessionDurationDays());
  return expiresAt;
}

export function getVerificationTokenExpiry(type: 'email_verification' | 'password_reset') {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + (type === 'password_reset' ? 1 : 24));
  return expiresAt;
}

export function isProductionAuth() {
  return authEnv.NODE_ENV === 'production';
}

export function getAppBaseUrl() {
  const value = process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL;

  if (value) {
    return z.url().parse(value);
  }

  if (authEnv.NODE_ENV !== 'production') {
    return 'http://localhost:3000';
  }

  throw new Error('APP_BASE_URL or NEXT_PUBLIC_APP_URL is required in production.');
}
