import crypto from 'node:crypto';

export interface CoinbaseJwtInput {
  readonly apiKeyId: string;
  readonly apiKeySecret: string;
  readonly requestMethod: string;
  readonly requestHost: string;
  readonly requestPath: string;
  readonly expiresInSec?: number;
  readonly audience?: readonly string[];
}

function base64UrlEncode(input: Buffer | string): string {
  const value = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return value
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function inferAlgorithm(secret: string): 'ES256' | 'EdDSA' {
  if (secret.includes('BEGIN EC PRIVATE KEY') || secret.includes('BEGIN PRIVATE KEY')) {
    return 'ES256';
  }

  return 'EdDSA';
}

export function signCoinbaseRestJwt(input: CoinbaseJwtInput): string {
  const now = Math.floor(Date.now() / 1000);
  const expiresInSec = input.expiresInSec ?? 120;
  const algorithm = inferAlgorithm(input.apiKeySecret);

  const header = {
    alg: algorithm,
    typ: 'JWT',
    kid: input.apiKeyId,
    nonce: crypto.randomUUID(),
  };

  const payload = {
    iss: 'cdp',
    sub: input.apiKeyId,
    nbf: now,
    exp: now + expiresInSec,
    aud: input.audience ?? ['retail_rest_api_proxy'],
    uris: [`${input.requestMethod.toUpperCase()} ${input.requestHost}${input.requestPath}`],
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const signingKey = crypto.createPrivateKey(input.apiKeySecret);

  const signature =
    algorithm === 'ES256'
      ? crypto.sign('sha256', Buffer.from(signingInput), {
          key: signingKey,
          dsaEncoding: 'ieee-p1363',
        })
      : crypto.sign(null, Buffer.from(signingInput), signingKey);

  return `${signingInput}.${base64UrlEncode(signature)}`;
}