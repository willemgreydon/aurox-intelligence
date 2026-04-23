import { randomBytes, timingSafeEqual } from 'node:crypto';
import { getAuthSecret } from './config';

const textEncoder = new TextEncoder();

function encodeBase64Url(bytes: Uint8Array) {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64url');
  }

  let binary = '';

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, 'base64url');
}

async function createHmacSignature(value: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(getAuthSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const signature = await crypto.subtle.sign('HMAC', key, textEncoder.encode(value));
  return encodeBase64Url(new Uint8Array(signature));
}

export function generateOpaqueToken() {
  return randomBytes(32).toString('base64url');
}

export async function hashSessionToken(token: string) {
  const digest = await crypto.subtle.digest('SHA-256', textEncoder.encode(token));
  return encodeBase64Url(new Uint8Array(digest));
}

export async function createSignedSessionValue(token: string) {
  const signature = await createHmacSignature(token);
  return `${token}.${signature}`;
}

export async function parseSignedSessionValue(value: string | undefined) {
  if (!value) {
    return null;
  }

  const [token, signature] = value.split('.');

  if (!token || !signature) {
    return null;
  }

  const expectedSignature = await createHmacSignature(token);
  const providedBuffer = decodeBase64Url(signature);
  const expectedBuffer = decodeBase64Url(expectedSignature);

  if (providedBuffer.length !== expectedBuffer.length) {
    return null;
  }

  return timingSafeEqual(providedBuffer, expectedBuffer) ? token : null;
}
