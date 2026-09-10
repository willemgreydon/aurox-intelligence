# ADR 0001: Deterministic-first philosophy

- Status: Accepted
- Date: 2026-06-19
- Deciders: Aurox core

## Context

Aurox Intelligence is a financial decision engine, not a generic web app. Every output can
ultimately influence capital. A system that produces different results for the same inputs cannot
be audited: when a signal triggers a trade, we must be able to reconstruct *exactly* the inputs and
computations that led to that decision. Post-mortems, regression tests, and risk attribution all
depend on reproducibility.

AI is part of the pipeline (forecasting, pattern recognition, recommendation composition), but AI
that is non-deterministic or unexplained is incompatible with a risk-governed execution system. The
project's priority order — Safety > Correctness > Determinism > Risk control > Architecture >
Observability > UX > Performance — places determinism above almost everything except correctness
and safety.

## Decision

Deterministic computation is the default and mandatory mode for all decision-relevant logic.

- Domain math (indicators, signal scoring, forecasting, accounting) is pure: same inputs always
  produce the same outputs.
- No hidden randomness. `Math.random()` is forbidden in scoring and forecasting logic. Any
  stochastic model must accept an explicit `seed` and reproduce its output for that seed.
- No ambient non-determinism. `Date.now()` must be passed in as a parameter, never read inside a
  pure function, so a computation can be replayed at any later time.
- Every signal, forecast, and recommendation carries an honest `confidence` value and a
  human-readable `explanation`. AI augments; it never silently decides.
- Outputs are traceable end to end: from canonical input data through pure transforms to the
  decision that consumed them.

## Consequences

**Positive**

- Any decision can be reproduced and audited from its recorded inputs.
- Domain logic is unit-testable with fixed fixtures and exact expected values.
- Regressions in scoring or accounting are caught by deterministic tests, not by chance.
- Explainability is built in, satisfying the "AI as augmentation, not authority" constraint.

**Negative**

- Engineering friction: passing `generatedAt`/`seed` through call sites is more verbose than
  reaching for `Date.now()` or `Math.random()`.
- Some model families (certain ML approaches) are harder to make deterministic and must be wrapped
  with explicit seeding or excluded from the decision-critical path.
- Determinism does not by itself guarantee correctness — a deterministic wrong formula is still
  wrong; it just fails the same way every time.

**Risks**

- A developer reaching for ambient randomness or wall-clock time inside a pure package silently
  breaks reproducibility. Mitigated by the purity rules and grep-based validation in CI/pre-push.
- Confidence values that are hardcoded rather than honestly derived undermine the whole chain; see
  the confidence-score rule.

## Alternatives considered

- **"Good enough" non-deterministic AI outputs.** Rejected: outputs that cannot be reproduced
  cannot be audited, and unauditable decisions are unacceptable in a capital-affecting system.
- **Determinism only in live mode.** Rejected: simulation must behave like a serious execution
  environment, so its outputs must be just as reproducible as live (see ADR 0002).
- **Snapshotting outputs instead of inputs.** Rejected: storing results without the ability to
  recompute them from inputs hides bugs and makes formula changes untestable against history.

## References

- [`../../.claude/rules/signal-purity-rule.md`](../../.claude/rules/signal-purity-rule.md)
- [`../../.claude/rules/forecasting-purity-rule.md`](../../.claude/rules/forecasting-purity-rule.md)
- [`../../.claude/rules/pure-domain-packages.md`](../../.claude/rules/pure-domain-packages.md)
- [`../../.claude/rules/confidence-score-rule.md`](../../.claude/rules/confidence-score-rule.md)
- [`../../.claude/rules/explainability-rule.md`](../../.claude/rules/explainability-rule.md)
- [`../signal-framework.md`](../signal-framework.md)
- Packages: [`packages/signals`](../../packages/signals), [`packages/forecasting`](../../packages/forecasting)
- See also: ADR 0006 (pure packages), ADR 0002 (simulation-first)
