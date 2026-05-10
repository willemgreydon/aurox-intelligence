import { beforeEach, describe, expect, it } from 'vitest';

process.env.AUTH_SECRET = 'test-auth-secret-with-at-least-32-characters';
process.env.AUTH_SESSION_DAYS = '30';

const {
  generateOpaqueToken,
  hashSessionToken,
  createSignedSessionValue,
  parseSignedSessionValue,
} = await import('./session-token');

describe('session token — Edge-compatible (Web Crypto only)', () => {
  describe('generateOpaqueToken', () => {
    it('generates a non-empty string', () => {
      const token = generateOpaqueToken();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });

    it('generates unique tokens on each call', () => {
      const tokens = new Set(Array.from({ length: 20 }, () => generateOpaqueToken()));
      expect(tokens.size).toBe(20);
    });

    it('uses only base64url-safe characters (no +, /, =)', () => {
      for (let i = 0; i < 20; i++) {
        const token = generateOpaqueToken();
        expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
      }
    });
  });

  describe('hashSessionToken', () => {
    it('returns a deterministic hash for the same token', async () => {
      const token = 'test-token-abc123';
      const hash1 = await hashSessionToken(token);
      const hash2 = await hashSessionToken(token);
      expect(hash1).toBe(hash2);
    });

    it('returns different hashes for different tokens', async () => {
      const hash1 = await hashSessionToken('token-a');
      const hash2 = await hashSessionToken('token-b');
      expect(hash1).not.toBe(hash2);
    });

    it('returns a base64url string', async () => {
      const hash = await hashSessionToken('test-token');
      expect(hash).toMatch(/^[A-Za-z0-9_-]+$/);
    });
  });

  describe('createSignedSessionValue', () => {
    it('returns a string containing exactly one dot separator', async () => {
      const token = generateOpaqueToken();
      const signed = await createSignedSessionValue(token);
      const dotCount = (signed.match(/\./g) ?? []).length;
      expect(dotCount).toBe(1);
    });

    it('embeds the original token before the dot', async () => {
      const token = generateOpaqueToken();
      const signed = await createSignedSessionValue(token);
      const [prefix] = signed.split('.');
      expect(prefix).toBe(token);
    });

    it('is deterministic: same token always produces same signed value', async () => {
      const token = 'deterministic-test-token';
      const a = await createSignedSessionValue(token);
      const b = await createSignedSessionValue(token);
      expect(a).toBe(b);
    });
  });

  describe('parseSignedSessionValue', () => {
    it('returns the original token for a valid signed value', async () => {
      const token = generateOpaqueToken();
      const signed = await createSignedSessionValue(token);
      const parsed = await parseSignedSessionValue(signed);
      expect(parsed).toBe(token);
    });

    it('returns null for undefined input', async () => {
      expect(await parseSignedSessionValue(undefined)).toBeNull();
    });

    it('returns null for empty string', async () => {
      expect(await parseSignedSessionValue('')).toBeNull();
    });

    it('returns null when no dot separator is present', async () => {
      expect(await parseSignedSessionValue('nodottoken')).toBeNull();
    });

    it('rejects a tampered token (changed payload)', async () => {
      const token = generateOpaqueToken();
      const signed = await createSignedSessionValue(token);
      const [, signature] = signed.split('.');
      const tampered = `differenttoken.${signature}`;
      expect(await parseSignedSessionValue(tampered)).toBeNull();
    });

    it('rejects a tampered signature (changed signature)', async () => {
      const token = generateOpaqueToken();
      const signed = await createSignedSessionValue(token);
      const [payload] = signed.split('.');
      const tampered = `${payload}.invalidsignatureXXXXXX`;
      expect(await parseSignedSessionValue(tampered)).toBeNull();
    });

    it('rejects a completely forged value', async () => {
      expect(await parseSignedSessionValue('forgedtoken.forgedsignature')).toBeNull();
    });

    it('rejects a value with empty token part', async () => {
      const signed = await createSignedSessionValue(generateOpaqueToken());
      const [, signature] = signed.split('.');
      expect(await parseSignedSessionValue(`.${signature}`)).toBeNull();
    });

    it('rejects a value with empty signature part', async () => {
      expect(await parseSignedSessionValue('sometoken.')).toBeNull();
    });
  });

  describe('round-trip integrity', () => {
    it('handles tokens with dashes and underscores (base64url range)', async () => {
      const token = 'token_with-dashes_and_underscores';
      const signed = await createSignedSessionValue(token);
      expect(await parseSignedSessionValue(signed)).toBe(token);
    });

    it('verifies 50 unique tokens round-trip correctly', async () => {
      for (let i = 0; i < 50; i++) {
        const token = generateOpaqueToken();
        const signed = await createSignedSessionValue(token);
        expect(await parseSignedSessionValue(signed)).toBe(token);
      }
    });
  });
});
