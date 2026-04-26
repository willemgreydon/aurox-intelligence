# Rule Index — Aurox Intelligence

All rules in `.claude/rules/`, grouped by category.

---

## 1. Architecture Boundaries

| File | Summary |
|---|---|
| `architecture-boundaries.md` | Package ownership table and import rules for all packages |
| `provider-boundary.md` | All external API calls must go through `packages/providers` |
| `db-boundary.md` | All SQL and transactions must live in `packages/db` |
| `api-contracts-boundary.md` | All shared types and Zod schemas live in `packages/api-contracts` |
| `pure-domain-packages.md` | `packages/signals` and `packages/forecasting` must be pure — no I/O |
| `app-orchestration-boundary.md` | `apps/web` orchestrates only — no domain logic |

---

## 2. Read / Write Patterns

| File | Summary |
|---|---|
| `query-mapper-service-route-ui.md` | Canonical read path: Query → Mapper → Service → Route → UI |
| `server-action-write-path.md` | Canonical write path: UI → Action → Zod → Service → Repo → Revalidate |
| `repository-transaction-rule.md` | Multi-table writes (order + transaction + position) must be atomic |
| `read-model-rule.md` | UI receives display-ready read models — no raw DB rows in components |
| `mapper-normalization-rule.md` | Mappers are pure sync transformation functions — no I/O |

---

## 3. Financial Safety

| File | Summary |
|---|---|
| `simulation-first-rule.md` | Simulation is the default execution target — live is explicitly gated |
| `no-fake-market-data.md` | Missing data → typed failure; never fabricate prices or signals |
| `risk-gates-required.md` | All execution paths must pass risk validation — no bypass permitted |
| `execution-safety.md` | Execution is fail-closed; validate everything before mutating state |
| `live-trading-lock.md` | Live execution requires broker + risk + readiness + kill switch + observability |
| `kill-switch-rule.md` | Kill switch must exist in all workflows; stored in DB, not in-memory |
| `broker-sandbox-rule.md` | Broker adapters default to sandbox; live requires explicit configuration |

---

## 4. Market Data

| File | Summary |
|---|---|
| `market-provider-rules.md` | Provider adapter contract: normalize, healthCheck, fallback chain |
| `provider-fallback-rule.md` | Fallback must be explicit, logged, and return `isFallback: true` |
| `rate-limit-rule.md` | 429 responses require exponential backoff; no immediate retry |
| `market-symbol-universe-rule.md` | All symbols must be canonical via `packages/ingestion` |
| `history-data-rule.md` | OHLCV must be gap-aware, sorted ascending, with minimum bar guards |
| `quote-snapshot-rule.md` | Quotes must carry `timestamp` and `isStale` — never missing |

---

## 5. Signals / Forecasting

| File | Summary |
|---|---|
| `signal-purity-rule.md` | Signals are pure functions: same input → same output, no I/O |
| `forecasting-purity-rule.md` | Forecasting is pure, deterministic, includes confidence intervals |
| `explainability-rule.md` | Every signal, forecast, and recommendation requires `explanation: string` |
| `indicator-derivation-rule.md` | Indicators declare minimum bars, guard NaN, are independently tested |
| `confidence-score-rule.md` | Confidence is honestly derived from data quality — never hardcoded |
| `insufficient-data-rule.md` | Insufficient data → `{ confidence: 0 }` — never NaN, never fake proceed |

---

## 6. Portfolio / Simulation

| File | Summary |
|---|---|
| `portfolio-accounting-rule.md` | PnL and cost basis computed in DB; no financial math in UI or services |
| `order-lifecycle-rule.md` | Orders follow a strict state machine: PENDING → SUBMITTED → FILLED/REJECTED |
| `position-sizing-rule.md` | All constraints (min_qty, step_size, max_pct) must be enforced before sizing |
| `simulation-auditability-rule.md` | Simulation records are append-only — never deleted |
| `snapshot-consistency-rule.md` | Portfolio snapshots are taken within a single DB transaction |

---

## 7. Performance / Caching

| File | Summary |
|---|---|
| `cache-safety-rule.md` | Portfolio and execution data must never use shared or long-lived cache |
| `request-dedupe-rule.md` | Use React `cache()` for per-request symbol deduplication |
| `next-cache-rule.md` | Cache config must be declared explicitly per route; portfolio = force-dynamic |
| `slow-route-performance-rule.md` | Independent fetches must run in parallel via `Promise.all` |
| `user-specific-cache-rule.md` | User financial data must never be served from a shared cache |
| `provider-call-budget-rule.md` | Max provider calls per page is bounded; use batch fetch |

---

## 8. UI / UX

| File | Summary |
|---|---|
| `financial-ui-safety-rule.md` | Mode badge always visible; no guaranteed return language; all states handled |
| `asset-card-action-rule.md` | Cards render read models; trade actions gated by server-side `canTrade` |
| `signal-visual-state-rule.md` | Low confidence and stale signals must be visually distinct |
| `mini-chart-rule.md` | Sparklines receive server-provided data; no client-side fetch on mount |
| `accessibility-rule.md` | WCAG 2.1 AA; semantic elements; keyboard-navigable; P&L has text + color |
| `workstation-ui-rule.md` | Monospace numbers; consistent decimals; all four states handled per section |

---

## 9. Testing / Validation

| File | Summary |
|---|---|
| `targeted-validation-rule.md` | Run only the checks for changed packages; separate baseline from regressions |
| `baseline-failure-rule.md` | `apps/web/server/auth/service.test.ts` is pre-existing — document, don't confuse |
| `regression-safety-rule.md` | High-risk changes require before/after test comparison |
| `test-data-rule.md` | Tests use fixed deterministic fixtures — no `Math.random()` |
| `pre-push-validation-rule.md` | Full checklist: typecheck + test + lint + build + risk checklist before push |

---

## 10. Documentation / PR Hygiene

| File | Summary |
|---|---|
| `change-summary-rule.md` | Every session ends with a structured report of what changed and what was verified |
| `rollback-notes-rule.md` | Every migration includes a rollback comment; destructive migrations are flagged |
| `known-issues-rule.md` | Pre-existing failures are documented in CLAUDE.md §4; never confused with regressions |
| `env-secret-rule.md` | No secrets in source; `.env` files never committed; use validated config helpers |
| `readme-update-rule.md` | Architecture, API, and contract changes update the relevant docs in the same PR |

---

## Improved Existing Rules

These files were pre-existing and have been upgraded to the full rule format:

| File | Previous State | Current State |
|---|---|---|
| `aurox-architecture.md` | Basic bullet list | Full rule format with boundaries table, validation commands, examples |
| `aurox-execution-risk.md` | Basic checklist | Full rule format with priority hierarchy, required pattern, examples |
| `aurox-ui-boundaries.md` | Basic permissions list | Full rule format with forbidden/required/validation sections |
| `aurox-testing-verification.md` | Basic commands list | Full rule format with reporting template and verification protocol |
