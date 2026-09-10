# ADR 0006: Pure `signals` and `forecasting` packages

- Status: Accepted
- Date: 2026-06-19
- Deciders: Aurox core

## Context

Signals and forecasts feed the intelligence and execution pipeline. If these functions perform I/O
(provider or DB calls) or carry hidden state, they cannot be unit-tested with fixed inputs, can
return different results on each call, and become untraceable when a bad output triggers a trade.
ADR 0001 commits the system to deterministic-first computation; signals and forecasting are where
that commitment is most load-bearing, because their outputs are directly consumed by risk checks
and execution decisions.

## Decision

`packages/signals` and `packages/forecasting` are pure computation packages.

- Every exported function is pure: typed inputs in, typed output out, same inputs always yield the
  same output, no side effects.
- No I/O: no `fetch`, no DB, no filesystem, no network. These packages must not import `@repo/db`,
  `@repo/providers`, or `@repo/agents`.
- No ambient non-determinism: no `Math.random()` in scoring; `Date.now()` is never read internally —
  timestamps and seeds are passed as parameters. Stochastic forecasts are reproducible for a given
  seed.
- Inputs are not mutated; there is no module-level mutable state.
- Contracts are honored. Signals return `SignalOutput { score ∈ [-1,1], confidence ∈ [0,1],
  explanation }`. Forecasts return predictions with confidence intervals, an aggregate
  `confidence`, an `explanation`, a `modelName`, and a passed-in `generatedAt`.
- Insufficient or invalid data (too few bars, NaN/Infinity, stale beyond threshold) returns
  `confidence: 0` with an explanation — never NaN, never a fabricated proceed. Indicators declare
  named minimum-bar constants and guard their inputs.

## Consequences

**Positive**

- Fully unit-testable with deterministic fixtures and exact expected values.
- Reproducible: the exact signal/forecast that led to a decision can be recomputed during a
  post-mortem.
- Safe to run in any context (server render, worker, test) with no environmental dependencies.
- Forces honest confidence and explainability into every output.

**Negative**

- Data fetching and orchestration must happen *outside* these packages (in queries/services), so
  call sites are more verbose — they gather data first, then call the pure function.
- Some models that naturally depend on external state must be restructured to receive that state as
  input.
- Threading `generatedAt`/`seed` through every entry point adds parameters.

**Risks**

- A single `await fetch(...)`, DB import, or `Math.random()` slipped into these packages breaks
  purity and reproducibility for the whole pipeline. Forbidden and grep-validated by the purity and
  insufficient-data rules.
- Hardcoded confidence (e.g. `0.8` regardless of data quality) defeats the safety value of these
  outputs; forbidden by the confidence-score rule.

## Alternatives considered

- **Let signal functions fetch their own data** (`computeSignal(symbol)` that calls a provider).
  Rejected: non-deterministic, untestable, and untraceable; couples math to I/O.
- **Allow internal caches/state for performance.** Rejected: hidden state breaks reproducibility and
  introduces cross-call contamination risk.
- **Throw on insufficient data instead of returning zero confidence.** Rejected as the default: a
  thrown error is harder to propagate as a typed degraded state; pure functions return
  `confidence: 0`, and only indicators throw typed errors that callers convert to zero confidence.

## References

- [`../../.claude/rules/pure-domain-packages.md`](../../.claude/rules/pure-domain-packages.md)
- [`../../.claude/rules/signal-purity-rule.md`](../../.claude/rules/signal-purity-rule.md)
- [`../../.claude/rules/forecasting-purity-rule.md`](../../.claude/rules/forecasting-purity-rule.md)
- [`../../.claude/rules/indicator-derivation-rule.md`](../../.claude/rules/indicator-derivation-rule.md)
- [`../../.claude/rules/insufficient-data-rule.md`](../../.claude/rules/insufficient-data-rule.md)
- [`../../.claude/rules/confidence-score-rule.md`](../../.claude/rules/confidence-score-rule.md)
- [`../signal-framework.md`](../signal-framework.md)
- Packages: [`packages/signals`](../../packages/signals), [`packages/forecasting`](../../packages/forecasting)
- See also: ADR 0001 (deterministic-first), ADR 0004 (boundaries)
