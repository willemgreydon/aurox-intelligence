import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.hoisted(() => {
  process.env.AUTH_SECRET = 'test-auth-secret-with-at-least-32-characters';
});

import { createSignedSessionValue } from './server/auth/session-token';
import { proxy } from './proxy';

describe('auth proxy', () => {
  it('does not redirect a guest route from a cookie signature alone', async () => {
    const signedCookie = await createSignedSessionValue('session-that-is-not-in-the-store');
    const request = new NextRequest('http://localhost/login', {
      headers: { cookie: `aurox-session=${signedCookie}` },
    });

    const response = await proxy(request);

    expect(response.status).toBe(200);
  });

  it('still protects authenticated routes without a signed session', async () => {
    const request = new NextRequest('http://localhost/account');

    const response = await proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost/login?next=%2Faccount');
  });
});
