# Runbook: Market Data Provider Outage / Rate-Limit

A market data provider (Polygon, Twelve Data, Tiingo, CoinGecko, Finnhub, EODHD,
Binance) is down, slow, returning errors, or rate-limiting (HTTP 429). This
runbook covers detection, the fallback chain behavior, what users see, recovery,
and when to lower confidence.

Related rules:
[`.claude/rules/provider-fallback-rule.md`](../../.claude/rules/provider-fallback-rule.md),
[`.claude/rules/rate-limit-rule.md`](../../.claude/rules/rate-limit-rule.md),
[`.claude/rules/no-fake-market-data.md`](../../.claude/rules/no-fake-market-data.md),
[`.claude/rules/quote-snapshot-rule.md`](../../.claude/rules/quote-snapshot-rule.md).

## Symptoms / Trigger

- Quotes or charts show stale or missing values; UI shows `—` or a staleness indicator.
- Elevated provider error rate in logs (`recordProviderFailure` fired repeatedly).
- HTTP 429 responses from a provider.
- Signal/forecast confidence dropping across many symbols at once.
- Provider monitor / admin health view shows a provider with a low health score.

## Severity

- **SEV-3** — one provider degraded, fallback active, data still correct and fresh enough.
- **SEV-2** — the entire fallback chain for an asset class is exhausted (all
  providers failing), so prices are missing or stale beyond threshold. Display is
  degraded but no capital corruption (simulation-only today).
- Round up to **SEV-2** if stale prices are feeding the simulation fill engine.

## Preconditions

- Repo access at `/Users/clausrainer/Apps/aurox-intelligence`.
- Ability to read application logs.
- Provider API keys configured server-side (see
  [`packages/providers/src/config.ts`](../../packages/providers/src/config.ts) and
  `.env`). Never print keys.

## How the system behaves (implemented)

Provider selection and health live in
[`packages/providers/src/market/provider-registry.ts`](../../packages/providers/src/market/provider-registry.ts):

- `resolveProvidersForRead(kind, assetKind, symbol)` returns an **ordered fallback
  chain** of configured providers that support the read kind and asset kind,
  sorted by a live health score plus a per-asset preference boost.
- `recordProviderSuccess` / `recordProviderFailure` update in-process health state
  (success/failure counts, last latency, last success/failure timestamps).
- `getProviderHealthStatuses()` exposes per-provider health for monitoring.
- A failing provider's health score drops, so it sinks in the ordering and the
  next healthy provider is tried automatically on subsequent reads.

The market client
([`packages/providers/src/market/client.ts`](../../packages/providers/src/market/client.ts))
walks the resolved chain, records success/failure per attempt, and reports
`fallbackUsed` and `staleCacheEligible` in its `ProviderSelectionResult`. The
app-layer cache
([`apps/web/server/lib/provider-cache.ts`](../../apps/web/server/lib/provider-cache.ts),
documented in [`docs/operations/cache-and-retention.md`](../operations/cache-and-retention.md))
serves last-known-good cached values on provider failure and **never writes a
failed response over a known-good DB snapshot**.

> **TARGET / planned:** Exponential backoff and a real rate-limit guard are
> currently stubs — [`packages/providers/src/shared/retry.ts`](../../packages/providers/src/shared/retry.ts)
> (`withRetry` just calls through) and
> [`packages/providers/src/shared/rate-limit.ts`](../../packages/providers/src/shared/rate-limit.ts)
> (`createRateLimitGuard` always allows). Until these are implemented, 429
> handling relies on the health-score demotion above, not on per-provider
> backoff. Treat repeated 429s as a reason to manually pause the offending
> provider (see step 4).

## Step-by-step actions

1. **Confirm which provider and asset class is affected.** Grep recent logs for
   provider failures:
   ```bash
   grep -iE "recordProviderFailure|provider.*(fail|429|timeout)" -r apps/web/.next 2>/dev/null | tail -40
   ```
   Or inspect the admin provider monitor view if available. Identify the
   provider name (e.g. `polygon`) and asset kind (`stock`/`etf`/`crypto`/`fx`/`index`).

2. **Confirm the fallback chain has healthy members.** The chain for the affected
   read is computed by `resolveProvidersForRead`. Verify at least one other
   configured provider supports that asset kind (see capability table in
   [`provider-registry.ts`](../../packages/providers/src/market/provider-registry.ts)).
   - Stocks/ETFs: polygon → twelve-data → finnhub → eodhd.
   - Crypto: coingecko → twelve-data → finnhub (+ binance for `BINANCE:` symbols).
   - If the chain is exhausted (no healthy supporting provider), this is **SEV-2**.

3. **Confirm users are seeing a degraded — not fabricated — state.** Per
   [`.claude/rules/no-fake-market-data.md`](../../.claude/rules/no-fake-market-data.md),
   missing data must render as `—`/"Data unavailable" with a staleness indicator,
   never a hardcoded or interpolated price. Spot-check an affected symbol in the
   UI. If you see a plausible-but-wrong price with no staleness marker, escalate
   to **SEV-1** (fabricated data entering the pipeline).

4. **If a provider is hard rate-limiting (sustained 429), pause it.** Because
   backoff is not yet implemented, manually demote the provider so the system
   stops hammering it:
   - Preferred: remove/blank that provider's API key in the running environment
     so `isProviderConfigured` returns false and it drops out of every chain, then
     restart the affected process. (Keep the key recorded securely to restore it.)
   - The remaining configured providers continue serving via the fallback chain.

5. **Verify confidence is being lowered downstream.** Stale or fallback data must
   reduce signal/forecast confidence (see _When to lower confidence_ below). If
   confidence is unchanged on stale data, treat as a correctness defect (**SEV-2**)
   and flag for fix-forward.

## When to lower confidence

Confidence must honestly reflect data quality
([`.claude/rules/confidence-score-rule.md`](../../.claude/rules/confidence-score-rule.md),
[`.claude/rules/quote-snapshot-rule.md`](../../.claude/rules/quote-snapshot-rule.md)):

- **Stale quote** (older than the asset's staleness threshold — stocks/ETFs 60s
  in-hours, crypto 30s, anything >15m always stale): reduce confidence ≥ 30%.
- **Fallback provider used** (`fallbackUsed: true`): reduce confidence ≥ 20%.
- **All providers failed** (no quote): confidence **0**; signals must return
  `{ score: 0, confidence: 0 }` and execution decisions must block on missing data.

## Verification

1. Affected symbols now resolve through a healthy fallback provider (check logs
   for `recordProviderSuccess` on the new provider).
2. The UI shows fresh values, or a clear staleness/degraded indicator where data
   is genuinely unavailable — never a fabricated number.
3. No 429 storm against the paused provider.
4. Run the provider package checks to confirm nothing is broken if you changed config:
   ```bash
   pnpm --filter @repo/providers typecheck
   pnpm --filter @repo/providers test
   ```

## Rollback / Recovery

1. When the primary provider recovers (vendor status page green, manual probe
   succeeds), restore its API key in the environment and restart the process.
2. The health score self-heals as `recordProviderSuccess` accumulates, and the
   provider re-climbs the ordering; no code change needed.
3. Confirm the chain has returned to its normal primary-first order via
   `getProviderHealthStatuses()` / the monitor view.

## Post-incident follow-up

- File a note on which provider failed, duration, and asset classes affected.
- If this was a 429 incident: prioritize implementing real backoff in
  [`retry.ts`](../../packages/providers/src/shared/retry.ts) and a real budget
  guard in [`rate-limit.ts`](../../packages/providers/src/shared/rate-limit.ts)
  per [`.claude/rules/rate-limit-rule.md`](../../.claude/rules/rate-limit-rule.md).
- If any fabricated/non-degraded display was observed, open a **SEV-1** correctness
  task — that is the highest priority outcome of this runbook.
- Update [`docs/market-data-provider-architecture.md`](../market-data-provider-architecture.md)
  if provider behavior or chain ordering changed.
