# Content Security Policy (CSP) Audit

**Last updated:** 2026-05-10
**Applies to:** `apps/web` (Next.js App Router)

---

## Current CSP Status

```
Content-Security-Policy: frame-ancestors 'self'
```

**Why only `frame-ancestors` is currently enforced:**

`frame-ancestors` is a fetch directive that controls which origins can embed this page in an `<iframe>`. It is analogous to `X-Frame-Options: SAMEORIGIN` but more precise. We enforce both (`X-Frame-Options` for older browsers that don't understand CSP, `frame-ancestors 'self'` for modern browsers).

A full CSP (`default-src`, `script-src`, `style-src`, etc.) requires auditing every inline script, every style block, and every external connection the browser itself makes. Deploying a full CSP without this audit would break the app. This document records the audit findings and the staged rollout plan.

---

## Browser-Visible External Origins Audit

All external HTTP calls in `apps/web` have been audited. **All of them are server-side only** (Next.js API routes, server components, server actions). The browser never directly connects to any of these origins.

| Origin | Purpose | Direction |
|---|---|---|
| `api.openai.com` | AI simulation agent | Server-side only |
| `testnet.binance.vision` | Binance sandbox broker | Server-side only |
| `api.coinbase.com` | Coinbase broker | Server-side only |
| `feeds.content.dowjones.io` | MarketWatch RSS | Server-side only |
| `www.nasdaq.com` | Nasdaq RSS | Server-side only |
| `www.coindesk.com` | CoinDesk RSS | Server-side only |
| `polygon.io` | Market data provider | Server-side only (via `@repo/providers`) |
| `twelvedata.com` | Market data provider | Server-side only |
| `coingecko.com` | Crypto data provider | Server-side only |

**Conclusion:** A `connect-src 'self'` policy (no external origins) is valid for the browser-facing layer because no client JavaScript calls any external API directly.

---

## Script Sources Audit

| Source | Inline scripts | External `<script src>` | `next/script` |
|---|---|---|---|
| `app/layout.tsx` | None | None | None |
| All page components | None | None | None |
| Third-party analytics | None — not used | None | None |

Next.js App Router renders some inline `<script>` tags for hydration (e.g. `__NEXT_DATA__`, RSC payload). These require `'unsafe-inline'` or nonces. The correct production approach is **nonce-based CSP** which Next.js 14+ supports natively via middleware.

---

## Style Sources Audit

| Source | External CSS | CDN |
|---|---|---|
| `app/globals.css` | None — only `@import "@repo/design-tokens/css"` and `@import "tailwindcss"` | None |
| Google Fonts | Loaded via `next/font/google` — **self-hosted at build time** | None |
| Component styles | Tailwind utility classes — inlined via PostCSS at build time | None |

**Conclusion:** `font-src 'self'` and `style-src 'self'` are valid. Next.js may inject inline `<style>` for critical CSS during SSR; nonces or `'unsafe-inline'` would be required there.

---

## Image Sources Audit

| Source | External domains |
|---|---|
| `/public/aurox.svg` | None |
| `<Image>` components | Only local `src="/..."` paths — no remote patterns configured |
| Chart SVGs | Inline SVG or local — no external image URLs |

**Conclusion:** `img-src 'self' data:` is valid (`data:` for potential inline SVG data URIs).

---

## Font Sources Audit

`IBM_Plex_Sans` and `IBM_Plex_Mono` are loaded via `next/font/google`. Next.js downloads these at **build time** and serves them from `/_next/static/`. The browser never contacts `fonts.googleapis.com` or `fonts.gstatic.com`.

**Conclusion:** `font-src 'self'` is valid.

---

## Frame Sources Audit

No `<iframe>` elements are used in the application. No TradingView widgets, no payment embeds, no third-party charts.

**Conclusion:** `frame-src 'none'` is valid.

---

## Recommended Full CSP (After Staged Rollout)

```
default-src 'self';
script-src 'self' 'nonce-{NONCE}';
style-src 'self' 'nonce-{NONCE}';
img-src 'self' data:;
font-src 'self';
connect-src 'self';
frame-src 'none';
frame-ancestors 'self';
base-uri 'self';
form-action 'self';
object-src 'none';
```

Where `{NONCE}` is a per-request cryptographically random base64 value generated in Next.js middleware and injected via the `nonce` prop on `<Script>` and `<style>` tags.

**Why `nonce-{NONCE}` instead of `'unsafe-inline'`:** Next.js 14+ App Router passes nonces through automatically if configured. `'unsafe-inline'` would negate most of the XSS protection a CSP provides.

---

## Staged Rollout Plan

### Stage 1 — Report-only (current sprint)

Deploy the CSP in `Content-Security-Policy-Report-Only` mode with the full policy. This causes zero browser blocking but logs all violations to a report endpoint.

```http
Content-Security-Policy-Report-Only: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-src 'none'; frame-ancestors 'self'; report-uri /api/csp-report
```

**Note:** `'unsafe-inline'` is used in report-only to avoid false positives during auditing. Violations from Next.js hydration scripts will appear and guide the nonce implementation.

### Stage 2 — Observe violations (1–2 weeks)

Monitor `/api/csp-report` violations. Expect violations from:
- Next.js `__NEXT_DATA__` inline script
- Next.js App Router RSC inline scripts
- Possible Tailwind critical CSS inline styles

### Stage 3 — Add nonce support

Implement nonce generation in `apps/web/proxy.ts` (Edge middleware):

```typescript
// In proxy.ts — add nonce to request headers for consumption by layout.tsx
const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
const cspHeader = `script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; ...`;
response.headers.set('Content-Security-Policy-Report-Only', cspHeader);
request.headers.set('x-nonce', nonce);
```

Pass the nonce through `<html>` via server component and apply to Next.js `<Script>` elements.

### Stage 4 — Enforce

Switch `Content-Security-Policy-Report-Only` to `Content-Security-Policy`. Keep `report-uri` for ongoing monitoring.

---

## What NOT to do

- Do not add `'unsafe-eval'` — never required for this app
- Do not add external origins to `connect-src` without confirming the browser actually calls them
- Do not add `'unsafe-inline'` to `script-src` in the enforced policy — defeats XSS protection
- Do not implement `report-to` without setting up a reporting endpoint first

---

## Known Next.js CSP Considerations

| Next.js Feature | CSP Implication |
|---|---|
| `<Script strategy="beforeInteractive">` | Requires nonce |
| `<Script strategy="afterInteractive">` | Requires nonce |
| App Router RSC inline scripts | Require nonce |
| `next/font` | Self-hosted, no external domain needed |
| `next/image` optimization | Served from `/_next/image` — `img-src 'self'` covers it |
| Fast Refresh (dev only) | Uses `eval()` — dev CSP should be permissive |

**Next.js official guide:** [Next.js CSP documentation](https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy)

---

## Summary Assessment

| Directive | Recommended Value | Risk if skipped |
|---|---|---|
| `default-src` | `'self'` | Medium — fallback for unlisted directives |
| `script-src` | `'self' 'nonce-{N}'` | **HIGH** — XSS primary vector |
| `style-src` | `'self' 'nonce-{N}'` | Medium — CSS injection |
| `img-src` | `'self' data:` | Low — no remote images |
| `font-src` | `'self'` | Low — self-hosted fonts |
| `connect-src` | `'self'` | Low — all external fetches are server-side |
| `frame-src` | `'none'` | Low — no iframes used |
| `frame-ancestors` | `'self'` | **HIGH** — clickjacking ✓ already enforced |
| `base-uri` | `'self'` | Medium — prevents base tag injection |
| `form-action` | `'self'` | Medium — prevents form hijacking |
| `object-src` | `'none'` | Medium — no plugins needed |

**Overall current risk from missing CSP directives:** Medium-low. The highest XSS risk (no `script-src`) is partially mitigated by: no user-generated HTML rendered without escaping, no `dangerouslySetInnerHTML` in financial components, and Next.js's automatic output escaping. The staged rollout is the correct approach.
