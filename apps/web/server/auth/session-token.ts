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

  return btoa(binary).replace(/[+]/g, '-').replace(/[/]/g, '_').replace(/=+$/g, '');
}

function decodeBase64Url(value: string): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(value, 'base64url'));
  }

  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

async function createHmacKey() {
  return crypto.subtle.importKey(
    'raw',
    textEncoder.encode(getAuthSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

export function generateOpaqueToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return encodeBase64Url(bytes);
}

export async function hashSessionToken(token: string) {
  const digest = await crypto.subtle.digest('SHA-256', textEncoder.encode(token));
  return encodeBase64Url(new Uint8Array(digest));
}

export async function createSignedSessionValue(token: string) {
  const key = await createHmacKey();
  const signature = await crypto.subtle.sign('HMAC', key, textEncoder.encode(token));
  const encoded = encodeBase64Url(new Uint8Array(signature));
  return token + '.' + encoded;
}

export async function parseSignedSessionValue(value: string | undefined) {
  if (!value) {
    return null;
  }

  const dotIndex = value.lastIndexOf('.');

  if (dotIndex === -1) {
    return null;
  }

  const token = value.slice(0, dotIndex);
  const signatureB64 = value.slice(dotIndex + 1);

  if (!token || !signatureB64) {
    return null;
  }

  try {
    const key = await createHmacKey();
    const decoded = decodeBase64Url(signatureB64);
    const signatureBytes = decoded.buffer.slice(decoded.byteOffset, decoded.byteOffset + decoded.byteLength) as ArrayBuffer;
    const valid = await crypto.subtle.verify('HMAC', key, signatureBytes, textEncoder.encode(token));
    return valid ? token : null;
  } catch {
    return null;
  }
}
