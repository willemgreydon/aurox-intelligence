import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './password';

describe('password hashing', () => {
  it('verifies a valid password against its stored hash', async () => {
    const password = 'Sup3rSecurePass!';
    const storedHash = await hashPassword(password);

    await expect(verifyPassword(password, storedHash)).resolves.toBe(true);
    await expect(verifyPassword('WrongPassword1', storedHash)).resolves.toBe(false);
  });

  it('rejects malformed stored hashes safely', async () => {
    await expect(verifyPassword('Sup3rSecurePass!', 'invalid-hash-format')).resolves.toBe(false);
  });
});
