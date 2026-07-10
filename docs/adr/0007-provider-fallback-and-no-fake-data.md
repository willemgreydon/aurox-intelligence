# ADR 0007: Provider fallback and no fake market data

- Status: Accepted
- Date: 2026-06-19
- Deciders: Aurox core

## Context

All price, volume, and fundamental data enters through external providers (polygon, twelve-data,
tiingo, coingecko, finnhub, eodhd), each with outages, rate limits, and differing response shapes.
A fabricated or silently-substituted price looks identical to a real one once it enters the signal
engine — and a signal computed on invented data can trigger a trade. Equally, hammering a
rate-limited provider escalates to API-key suspension, wiping out market data for hours. The system
must degrade honestly: missing data must surface as low confidence or an explicit unavailable state,
never as an invented value.

## Decision

Provider access is centralized, fallback-chained, and never fabricated.

- All external data access lives in `packages/providers`; routing is configured in
  `packages/providers/src/market/routing.ts`. Adapters normalize responses to canonical `Quote` /
  `OHLCV` shapes and implement `healthCheck()`.
- Fallback is explicit and observable: providers are tried in configured priority order, each
  attempt logged; on a provider failure the next is tried; the result records `provider`,
  `isFallback`, and `isStale`. A fallback result lowers downstream confidence.
- No fake data. If all fallbacks fail, the routing returns a typed failure (`quote: null`,
  `error: "all_providers_failed"`) — never a hardcoded, random, or interpolated price. Stale data
  is returned only with `isStale: true` and a freshness timestamp; quotes always carry a
  `timestamp`. Missing input data drives signal `confidence` to 0 and blocks execution decisions.
- Rate limits are respected: 429s use exponential backoff with jitter (no immediate retry), a
  rate-limited provider is skipped in the fallback chain during cooldown, and per-provider budgets
  bound calls. Pages batch symbol fetches to stay within provider call budgets.

## Consequences

**Positive**

- A provider outage degrades to an honest "data unavailable" / lowered-confidence state instead of
  a fabricated price entering the decision pipeline.
- Callers always know whether data came from primary or fallback, and how fresh it is, so
  confidence reflects reality.
- Backoff and budgets protect API keys from suspension, keeping data flowing.
- Centralized routing keeps keys server-side and response shapes normalized.

**Negative**

- More moving parts than a single-provider integration: a routing chain, per-provider adapters,
  health checks, backoff, and budget accounting to maintain.
- Honest degradation means the UI sometimes shows "—" / "data unavailable" instead of a number,
  which can look like a defect to users unfamiliar with the design.
- Batch-fetch and dedup requirements add constraints on how queries are written.

**Risks**

- A silent fallback (firing but not signaling `isFallback`/`isStale`) lets a degraded signal enter
  execution with full confidence; forbidden by the provider-fallback rule.
- Any hardcoded fallback price (`?? 100`), random jitter, or unflagged stale return is a critical
  defect; forbidden and grep-validated by the no-fake-market-data and quote-snapshot rules.
- An immediate retry on 429 can suspend a key; forbidden by the rate-limit rule.

## Alternatives considered

- **Single provider, fail hard on outage.** Rejected: a single point of failure for all market
  data; an outage blanks the system.
- **Substitute last-known or interpolated values on failure.** Rejected: fabricated data is
  indistinguishable from real once downstream and can trigger trades on invented prices.
- **Retry the failing provider immediately.** Rejected: escalates rate-limit violations toward
  key suspension.

## References

- [`../../.claude/rules/no-fake-market-data.md`](../../.claude/rules/no-fake-market-data.md)
- [`../../.claude/rules/provider-fallback-rule.md`](../../.claude/rules/provider-fallback-rule.md)
- [`../../.claude/rules/rate-limit-rule.md`](../../.claude/rules/rate-limit-rule.md)
- [`../../.claude/rules/market-provider-rules.md`](../../.claude/rules/market-provider-rules.md)
- [`../../.claude/rules/provider-boundary.md`](../../.claude/rules/provider-boundary.md)
- [`../../.claude/rules/quote-snapshot-rule.md`](../../.claude/rules/quote-snapshot-rule.md)
- [`../../.claude/rules/history-data-rule.md`](../../.claude/rules/history-data-rule.md)
- [`../market-data-provider-architecture.md`](../market-data-provider-architecture.md), [`../provider-secret-safety.md`](../provider-secret-safety.md)
- Packages: [`packages/providers`](../../packages/providers), [`packages/ingestion`](../../packages/ingestion)
- See also: ADR 0001 (deterministic-first), ADR 0006 (pure packages)
