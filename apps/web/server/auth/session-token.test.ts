import { beforeEach, describe, expect, it } from 'vitest';

process.env.AUTH_SECRET = 'test-auth-secret-with-at-least-32-characters';

const {
  createSignedSessionValue,
  generateOpaqueToken,
  hashSessionToken,
  parseSignedSessionValue,
} = await import('./session-token');

describe('session token utilities', () => {
  beforeEach(() => {
    process.env.AUTH_SECRET = 'test-auth-secret-with-at-least-32-characters';
  });

  it('signs and verifies opaque session cookie values', async () => {
    const token = generateOpaqueToken();
    const signedValue = await createSignedSessionValue(token);

    await expect(parseSignedSessionValue(signedValue)).resolves.toBe(token);
  });

  it('rejects tampered signed cookie values', async () => {
    const token = generateOpaqueToken();
    const signedValue = await createSignedSessionValue(token);
    const tampered = `${signedValue}tampered`;

    await expect(parseSignedSessionValue(tampered)).resolves.toBeNull();
  });

  it('hashes the same token deterministically', async () => {
    const token = generateOpaqueToken();

    await expect(hashSessionToken(token)).resolves.toBe(await hashSessionToken(token));
  });
});
