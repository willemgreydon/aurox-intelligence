import { z } from 'zod';

const authEnvSchema = z.object({
  AUTH_SECRET: z.string().trim().min(32, 'AUTH_SECRET must be at least 32 characters.'),
  AUTH_SESSION_DAYS: z.coerce.number().int().min(1).max(90).default(30),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

const authEnv = authEnvSchema.parse({
  AUTH_SECRET: process.env.AUTH_SECRET,
  AUTH_SESSION_DAYS: process.env.AUTH_SESSION_DAYS,
  NODE_ENV: process.env.NODE_ENV ?? 'development',
});

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
