# `@repo/forecasting` — Pure Forecast Composition

**Package:** `packages/forecasting` · **npm name:** `@repo/forecasting`
**Status:** Authoritative — update after each forecast model change.

Turns a deterministic `SignalSnapshot` (from [`@repo/signals`](./signals.md)) into an
explainable, scenario-weighted `Forecast` read model.

---

## 1. Purpose & Boundary

This package produces directional, horizon-tagged forecasts with confidence, scenario
weights, key drivers, and risk factors. It is a **pure computation package** —
reproducible and deterministic for audit.

Boundary constraints (`.claude/rules/forecasting-purity-rule.md`,
`pure-domain-packages.md`, `architecture-boundaries.md`):

- **No I/O.** No `fetch`, no DB, no provider calls.
- **No imports from** `@repo/db`, `@repo/providers`, `@repo/agents`.
- **Timestamps are passed in.** The producer never calls `Date.now()` /
  `new Date()` internally — `producedAt` is a required argument so the same inputs
  always yield the same forecast (asserted in tests).
- May import `@repo/api-contracts` (the `Forecast` schema/type) and `@repo/signals`
  (the `SignalSnapshot` input type) — both type-only.

---

## 2. Directory Map

| Subfolder | Responsibility |
|---|---|
| `engine/` | `build-forecast.ts` — the **only re-exported** producer (`buildForecast`, `buildForecastFromSignal`). Also holds helper scaffolds: `confidence-model`, `risk-model`, `scenario-generator`. |
| `models/` | Local TS scaffolds `ForecastInput` / `ForecastOutput`. **Not** the canonical contract (that is `@repo/api-contracts` `Forecast`). |
| `horizons/` | Horizon constants (`SHORT_TERM_HORIZON`, `MEDIUM_TERM_HORIZON`, `LONG_TERM_HORIZON`). Scaffold. |
| `explainability/` | `buildDriverSummary`, `buildInvalidationFactors`. Scaffold helpers. |
| `__tests__/` | Deterministic Vitest specs for the producer + helpers. |

> **CURRENT vs scaffold:** `index.ts` re-exports **only** `engine/build-forecast`.
> Everything under `models/`, `horizons/`, `explainability/`, and the
> `engine/confidence-model | risk-model | scenario-generator` helpers exist in-tree,
> are unit-tested, but are **not** part of the public entry point. They are staged
> building blocks for a richer calibrated engine (FUTURE target).

---

## 3. Key Exports / Public API

Re-exported from `packages/forecasting/src/index.ts` → `engine/build-forecast.ts`:

| Export | Signature (summary) | What it does |
|---|---|---|
| `buildForecast` | `(assetId: string, producedAt: string) => Forecast` | Neutral baseline scaffold forecast (`directionalBias: 'neutral'`, `confidenceScore: 0.5`, balanced scenario weights). Echoes `producedAt`. |
| `buildForecastFromSignal` | `(signal: SignalSnapshot, producedAt: string) => Forecast` | Maps a signal snapshot to a forecast: bias from `interpretation`, confidence from `|compositeScoreValue|` + a bounded volatility term, scenario weights from bias+confidence, drivers/risk factors from MA/momentum/volatility. |

Present in-tree but **not** re-exported (direct path only):

| Export | Path | Behavior |
|---|---|---|
| `calculateConfidenceScore` | `engine/confidence-model.ts` | `clamp(signalCount / 10, 0, 1)`. |
| `buildRiskFactors` | `engine/risk-model.ts` | Stable list `['provider freshness', 'macro regime change']`. |
| `generateScenarios` | `engine/scenario-generator.ts` | Returns `['base']`. |
| `buildDriverSummary` | `explainability/driver-summary.ts` | `drivers.join(', ')`. |
| `buildInvalidationFactors` | `explainability/invalidation-factors.ts` | Stable list `['trend reversal', 'unexpected policy shock']`. |
| `SHORT/MEDIUM/LONG_TERM_HORIZON` | `horizons/*.ts` | `'short' \| 'medium' \| 'long'` string constants. |
| `ForecastInput` / `ForecastOutput` | `models/*.ts` | Local scaffold interfaces (not the canonical contract). |

---

## 4. Core Contracts Consumed / Produced

**Consumes:** `SignalSnapshot` from [`@repo/signals`](./signals.md) (type-only).
**Produces:** the canonical `Forecast` from `@repo/api-contracts`
(`packages/api-contracts/src/forecasts/forecast.ts`):

```ts
// @repo/api-contracts — forecastSchema / Forecast
{
  assetId: string;
  horizon: 'short' | 'medium' | 'long';
  directionalBias: 'bullish' | 'bearish' | 'neutral';
  confidenceScore: number;                 // [0, 1]
  scenarioSummary: string;
  scenarioWeights: {                       // each [0, 1]; sum ≈ 1
    bullish: number;
    base: number;
    bearish: number;
  };
  keyDrivers: string[];
  riskFactors: string[];
  producedAt: string;                      // passed in — never generated internally
}
```

`ForecastOutput` / `ForecastInput` in `models/` are **scaffolds** and intentionally
narrower; do not treat them as the contract. The canonical, Zod-validated shape is
`Forecast` from `@repo/api-contracts`.

### Current formulas (`build-forecast.ts`)

```
// buildForecastFromSignal
directionalBias = signal.interpretation                       (bullish | bearish | neutral)
confidenceScore = clamp(|compositeScoreValue| + min(volatility/100, 0.15), 0.35, 0.9)

// computeScenarioWeights(bias, confidence), c = clamp(confidence, 0, 1)
bullish bias:  bullish = 0.30 + 0.40·c ; bearish = max(0.10, (1−bullish)·0.35) ; base = max(0, 1−bullish−bearish)
bearish bias:  bearish = 0.30 + 0.40·c ; bullish = max(0.10, (1−bearish)·0.35) ; base = max(0, 1−bullish−bearish)
neutral bias:  wing = max(0.15, 0.30 − 0.15·c) ; bullish = bearish = wing ; base = max(0, 1 − 2·wing)
```

Weights are constructed to remain non-negative and sum to ~1 (asserted in tests).

---

## 5. Determinism & Purity Invariants

| Invariant | How it holds |
|---|---|
| Same `(input, producedAt)` ⇒ deep-equal forecast | No randomness/time; `producedAt` is an argument. Asserted via `toEqual`. |
| Only `producedAt` varies when only the timestamp changes | Verified: `{...c, producedAt: A}` deep-equals the `A` forecast. |
| `confidenceScore ∈ [0.35, 0.9]` (from-signal) / `0.5` (baseline) | Final `clamp(..., 0.35, 0.9)`. |
| `scenarioWeights` non-negative and sum ≈ 1 | `max(0, ...)` floors + complementary construction. |
| No external state / no I/O | Pure functions, type-only imports. |

Validation (per `forecasting-purity-rule.md`):

```bash
grep -r "async function\|await \|fetch(\|Date\.now()\|Math\.random" packages/forecasting/src --include="*.ts"
grep -r "import.*@repo/db\|import.*@repo/providers\|import.*@repo/agents" packages/forecasting/src --include="*.ts"
```

---

## 6. Failure Modes

| Condition | Behavior |
|---|---|
| Low / near-zero signal | `confidenceScore` clamps **up** to the `0.35` floor (from-signal) — never reports false high confidence. |
| Very strong signal | `confidenceScore` clamps **down** to the `0.9` ceiling — no automated `1.0`. |
| `null` MA / momentum on the snapshot | Drivers render `'n/a'` via `?.toFixed(2) ?? 'n/a'`; no throw, no `NaN` string. |
| No live calibration yet | `buildForecast` returns an explicit neutral baseline with `keyDrivers: ['insufficient live data wired yet']` and a calibration caveat in `riskFactors` — degraded state is surfaced, not hidden. |

> The current engine is intentionally conservative: confidence is honestly bounded and
> never fabricated (`confidence-score-rule.md`). It does **not** yet emit per-bar
> predictions with confidence intervals — that is a FUTURE target, not a current claim.

---

## 7. How to Extend

**Add / change the forecast producer**
1. Edit `packages/forecasting/src/engine/build-forecast.ts`.
2. Keep `producedAt` as a parameter — never call `Date.now()`/`new Date()` internally.
3. Keep outputs schema-valid against `@repo/api-contracts` `forecastSchema` (bias enum, confidence `[0,1]`, weights `[0,1]` summing to ~1).
4. Add determinism + bounds assertions in `__tests__/build-forecast.test.ts`.

**Add a new horizon**
1. Add the constant under `horizons/`.
2. Extend `forecastSchema.horizon` enum in `@repo/api-contracts` **first** (contract-first).
3. Wire the horizon into the producer and re-export if it becomes public.

**Promote a scaffold helper** (`confidence-model`, `risk-model`, `scenario-generator`, `explainability/*`)
- Integrate it into `build-forecast.ts`, re-export from `index.ts` if it becomes public API, then update §3 (CURRENT vs scaffold) here.

---

## 8. Testing Notes

| Test file | Covers |
|---|---|
| `__tests__/build-forecast.test.ts` | Baseline neutrality + bounds; `producedAt` echo (no internal time); bias mapping from interpretation; `[0.35, 0.9]` confidence band; weights valid + sum to 1; full determinism across timestamps. Uses a plain `makeSnapshot()` fixture (no random/time). |
| `__tests__/engine-helpers.test.ts` | `calculateConfidenceScore` scaling/clamping; stable lists from `generateScenarios`/`buildRiskFactors`/`buildInvalidationFactors`; `buildDriverSummary` join + empty case. |

Run:

```bash
pnpm --filter @repo/forecasting typecheck
pnpm --filter @repo/forecasting test
```

---

## 9. Related Docs

- [signals.md](./signals.md) — produces the `SignalSnapshot` input
- [agents.md](./agents.md) — execution layer that consumes intelligence
- `packages/api-contracts/src/forecasts/forecast.ts` — canonical `Forecast` schema
- `.claude/rules/forecasting-purity-rule.md`, `confidence-score-rule.md`, `explainability-rule.md`
