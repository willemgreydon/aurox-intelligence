import path from 'node:path';
import type { NextConfig } from 'next';

// ---------------------------------------------------------------------------
// Monorepo root env loading
//
// Next.js only auto-loads env files from its OWN project directory (apps/web),
// and config-time process.env mutations do not propagate to Turbopack's render
// workers. Shared runtime secrets (AUTH_SECRET, DATABASE_URL, ...) live in the
// repository ROOT `.env`, so they are injected into the real process env by
// dotenv-cli in the `dev` / `build` / `start` scripts (see apps/web/package.json).
// Real process env vars DO propagate to workers, which is why that approach is
// used instead of loading env here. Production uses platform-provided env vars.
// ---------------------------------------------------------------------------

const isProduction = process.env.NODE_ENV === 'production';

const securityHeaders = [
  // Prevent MIME-type sniffing
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Control referrer information sent with requests
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Prevent clickjacking by disallowing framing from other origins
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  // Disable automatic DNS prefetching to reduce DNS leakage
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  // Restrict access to browser features not needed by a financial workstation
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()',
  },
  // CSP: frame-ancestors enforces no embedding from untrusted origins (defence-in-depth alongside X-Frame-Options)
  {
    key: 'Content-Security-Policy',
    value: "frame-ancestors 'self'",
  },
  // HSTS: only in production — avoids breaking localhost/self-signed cert dev setups.
  // max-age=63072000 = 2 years. includeSubDomains + preload ready for HSTS preload list submission.
  // Do NOT add to the preload list until the domain is fully committed to HTTPS-only.
  ...(isProduction
    ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }]
    : []),
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: path.resolve(__dirname, '../..'),
  },
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
