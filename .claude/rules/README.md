# .claude/rules — Aurox Intelligence Rule System

This directory contains project-specific rules for Claude Code and all AI agents working in the Aurox Intelligence repository.

Rules are automatically loaded by Claude Code as part of every session context.

---

## Rule Categories

### 1. Architecture Boundaries
Rules for package ownership, import restrictions, and data flow contracts.
- `architecture-boundaries.md` — Overview of all package boundaries
- `provider-boundary.md` — Only `packages/providers` may call external APIs
- `db-boundary.md` — Only `packages/db` may write SQL
- `api-contracts-boundary.md` — Shared types live only in `packages/api-contracts`
- `pure-domain-packages.md` — `signals` and `forecasting` must be pure (no I/O)
- `app-orchestration-boundary.md` — `apps/web` orchestrates, does not own domain logic

### 2. Read / Write Patterns
Rules for the canonical data flow patterns throughout the system.
- `query-mapper-service-route-ui.md` — Canonical read path
- `server-action-write-path.md` — Canonical write path with Zod + transaction
- `repository-transaction-rule.md` — Multi-table writes must be atomic
- `read-model-rule.md` — UI receives pre-shaped read models only
- `mapper-normalization-rule.md` — Mappers are pure transformation functions

### 3. Financial Safety
Rules that protect capital, prevent incorrect execution, and maintain simulation integrity.
- `simulation-first-rule.md` — Simulation is the default, live is gated
- `no-fake-market-data.md` — Never fabricate or silently substitute market data
- `risk-gates-required.md` — All execution paths must pass risk validation
- `execution-safety.md` — Execution is fail-closed; no partial state mutations
- `live-trading-lock.md` — Live execution requires a multi-step readiness gate
- `kill-switch-rule.md` — Kill switch must be present in all execution workflows
- `broker-sandbox-rule.md` — Brokers default to sandbox; live requires explicit activation

### 4. Market Data
Rules for provider access, fallback handling, and data quality.
- `market-provider-rules.md` — Provider adapter contract and normalization requirements
- `provider-fallback-rule.md` — Fallback must be explicit and observable
- `rate-limit-rule.md` — 429 responses must use exponential backoff
- `market-symbol-universe-rule.md` — All symbols must be canonical
- `history-data-rule.md` — OHLCV data must be gap-aware and sorted
- `quote-snapshot-rule.md` — Quotes must carry freshness metadata

### 5. Signals / Forecasting
Rules for pure function packages and intelligence pipeline integrity.
- `signal-purity-rule.md` — Signals must be deterministic pure functions
- `forecasting-purity-rule.md` — Forecasting must be pure and reproducible
- `explainability-rule.md` — Every output must include a human-readable explanation
- `indicator-derivation-rule.md` — Indicators must validate inputs and declare minimums
- `confidence-score-rule.md` — Confidence must be honestly derived, never hardcoded
- `insufficient-data-rule.md` — Missing data returns `confidence: 0`, never NaN

### 6. Portfolio / Simulation
Rules for simulation accounting integrity and position lifecycle.
- `portfolio-accounting-rule.md` — PnL computed once in DB, never re-derived in UI
- `order-lifecycle-rule.md` — Order state machine must be enforced
- `position-sizing-rule.md` — All constraints must be respected before sizing
- `simulation-auditability-rule.md` — Simulation records must be append-only
- `snapshot-consistency-rule.md` — Snapshots must be taken within a single transaction

### 7. Performance / Caching
Rules for cache correctness, provider budget, and route performance.
- `cache-safety-rule.md` — Execution-adjacent data must never use shared cache
- `request-dedupe-rule.md` — Identical symbol requests must be deduplicated
- `next-cache-rule.md` — Cache must be declared explicitly per route type
- `slow-route-performance-rule.md` — Independent fetches must run in parallel
- `user-specific-cache-rule.md` — User financial data must never be served from shared cache
- `provider-call-budget-rule.md` — Max provider calls per page render is bounded

### 8. UI / UX
Rules for financial workstation UI quality and safety.
- `financial-ui-safety-rule.md` — No guaranteed return language, mode badge always visible
- `asset-card-action-rule.md` — Cards render read models, gate actions on `canTrade`
- `signal-visual-state-rule.md` — Low confidence and stale data must be visually communicated
- `mini-chart-rule.md` — Sparklines use server-provided data, no client-side fetch
- `accessibility-rule.md` — WCAG 2.1 AA minimum, keyboard-navigable, screen reader compatible
- `workstation-ui-rule.md` — Dense, professional, consistent, all states handled

### 9. Testing / Validation
Rules for targeted, honest verification practices.
- `targeted-validation-rule.md` — Run narrowest meaningful check; separate baseline from regressions
- `baseline-failure-rule.md` — Known pre-existing failures must be documented, not confused with regressions
- `regression-safety-rule.md` — High-risk changes require before/after comparison
- `test-data-rule.md` — Tests use fixed, deterministic, realistic fixtures
- `pre-push-validation-rule.md` — Full pre-push checklist must pass before pushing

### 10. Documentation / PR Hygiene
Rules for change traceability and documentation currency.
- `change-summary-rule.md` — Every session ends with a structured change summary
- `rollback-notes-rule.md` — Every migration includes a rollback plan
- `known-issues-rule.md` — Pre-existing failures must be documented in CLAUDE.md §4
- `env-secret-rule.md` — No secrets in code, `.env` files never committed
- `readme-update-rule.md` — Architecture and API changes update the relevant docs

---

## How Claude Code Uses These Rules

Rules in this directory are loaded automatically as part of Claude Code's project context. They guide:

- Which package a new feature belongs in
- When to run which verification commands
- How to handle data flow patterns correctly
- What constitutes a blocking safety concern

Rules are not suggestions — they are operating constraints for all AI agents and contributors.

---

## Daily Development Workflow

```bash
# 1. Check git state
git status

# 2. Implement change in correct package (see architecture-boundaries.md)

# 3. Verify changed packages
pnpm --filter @repo/<changed> typecheck
pnpm --filter @repo/<changed> test

# 4. Build if web changed
pnpm build:web

# 5. Produce change summary (see change-summary-rule.md)
```

---

## Pre-Push Workflow

```bash
pnpm --filter @repo/api-contracts typecheck
pnpm --filter @repo/db typecheck
pnpm --filter @repo/providers typecheck
pnpm --filter @repo/signals typecheck
pnpm --filter @repo/forecasting typecheck
pnpm --filter @repo/agents typecheck
pnpm test
pnpm lint
pnpm build:web
# + manual risk checklist (see pre-push-validation-rule.md)
```

---

## Performance Workflow

When investigating a slow route:
1. Check for sequential fetches that can be parallelized (`slow-route-performance-rule.md`)
2. Check for N+1 provider calls (`provider-call-budget-rule.md`)
3. Check cache configuration (`next-cache-rule.md`)
4. Check for missing request deduplication (`request-dedupe-rule.md`)

---

## Simulation Safety Workflow

When working on simulation accounting:
1. Ensure all multi-table writes are transactional (`repository-transaction-rule.md`)
2. Ensure order lifecycle rules are enforced (`order-lifecycle-rule.md`)
3. Ensure PnL is computed by DB — not by application layer (`portfolio-accounting-rule.md`)
4. Ensure snapshots are consistent (`snapshot-consistency-rule.md`)
5. Ensure audit trail is append-only (`simulation-auditability-rule.md`)

---

## Live Readiness Workflow

Before any live execution path is touched:
1. Verify kill switch is present (`kill-switch-rule.md`)
2. Verify live gate is enforced (`live-trading-lock.md`)
3. Verify broker defaults to sandbox (`broker-sandbox-rule.md`)
4. Verify risk gates are active for live path (`risk-gates-required.md`)
5. Run `/live-readiness-check` command
