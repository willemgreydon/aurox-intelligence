# CLAUDE.md — AUROX INTELLIGENCE ENTERPRISE MASTER

This is the mandatory operating contract for Claude Code and all AI coding agents working in this repository.

Aurox Intelligence is a deterministic-first financial intelligence, simulation, and future live-trading platform.

Claude must treat this repository as:

- a financial decision system
- a simulation trading engine
- a risk-governed execution platform
- a multi-asset market intelligence workstation
- a future autonomous broker-connected system

This is not a generic SaaS dashboard.

Every change must preserve safety, determinism, auditability, and monorepo boundaries.

---

## 1. Core Mission

Improve Aurox Intelligence in ways that are:

- architecture-safe
- deterministic where it matters
- incremental
- production-realistic
- auditable
- reversible
- testable
- aligned with simulation-first trading

Priority order:

1. Safety
2. Correctness
3. Determinism
4. Risk control
5. Architecture integrity
6. Observability
7. UX quality
8. Performance
9. Convenience

If these priorities conflict, choose the higher priority.

---

## 2. Financial Safety Doctrine

Claude must always assume:

- execution logic may later move real capital
- accounting mistakes are critical defects
- risk bypasses are unacceptable
- AI suggestions are not execution permission
- simulation must behave like a serious execution environment

Absolute rule:

```text
If risk, accounting, or execution state is uncertain, do not execute.
```

---

## 3. Repository Commands

Use pnpm only.

```bash
pnpm install
cp .env.example .env

node packages/db/scripts/migrate.mjs

pnpm dev
pnpm dev:web
pnpm dev:worker

pnpm build
pnpm build:web

pnpm typecheck
pnpm --filter @repo/api-contracts typecheck
pnpm --filter @repo/db typecheck
pnpm --filter @repo/providers typecheck
pnpm --filter @repo/signals typecheck
pnpm --filter @repo/forecasting typecheck
pnpm --filter @repo/agents typecheck

pnpm test
pnpm lint
pnpm clean
```

Package-level tests:

```bash
pnpm --filter @repo/<package> test
vitest run
```

Turbo pattern:

```bash
pnpm --filter @repo/<package> <script>
```

---

## 4. Known Baseline Issue

`apps/web/server/auth/service.test.ts` has an existing auth test typing issue that may fail full web typecheck.

Rules:

- Do not hide this issue.
- Do not treat unrelated baseline failures as introduced failures.
- Always validate changed packages independently.
- Clearly separate:
  - changed-code failures
  - unrelated baseline failures
  - not-run checks

---

## 5. Monorepo Architecture

```text
apps/
  web/                         # Next.js App Router UI + server orchestration

packages/
  api-contracts/               # Zod schemas and shared TypeScript contracts
  db/                          # Postgres repositories, migrations, raw SQL read models
  providers/                   # External market/macro/news/banking data adapters
  ingestion/                   # Canonicalization and ingestion pipeline, when present
  signals/                     # Pure signal derivation, no I/O
  forecasting/                 # Pure forecasting and explainability, no I/O
  agents/                      # Trade workflows, policy enforcement, broker adapters
  ai-market-intelligence/      # Recommendation and intelligence composition
  observability/               # Logging, metrics, tracing
  design-tokens/               # Shared CSS/TS design tokens
```

---

## 6. Non-Negotiable Package Boundaries

### `packages/api-contracts`

The source of truth for:

- Zod schemas
- shared TypeScript contracts
- route-independent domain contracts
- execution contracts
- read model contracts when shared

Never fork shared contracts inside `apps/web`.

---

### `packages/db`

The only place for:

- SQL
- repositories
- migrations
- transactions
- persisted read models

Routes, components, agents, and services must not query Postgres directly.

---

### `packages/providers`

The only place for:

- external provider clients
- provider fallback routing
- provider response normalization
- API transport
- provider health checks
- market/macro/news/banking data adapters

Never call external data providers from UI components or route files.

---

### `packages/ingestion`

When present, this owns:

- canonical symbol mapping
- raw provider observation processing
- canonical market models
- ingestion runs
- data quality scoring

Do not duplicate canonicalization logic elsewhere.

---

### `packages/signals`

Must remain pure.

Allowed:

- indicators
- signal scoring
- deterministic feature transforms

Forbidden:

- DB calls
- provider calls
- network calls
- hidden state
- random execution logic

---

### `packages/forecasting`

Must remain pure.

Allowed:

- forecasting logic
- explainability
- time-series transforms

Forbidden:

- DB calls
- provider calls
- route-level side effects
- UI formatting

---

### `packages/agents`

Owns:

- trade workflows
- broker adapters
- simulation/live routing
- readiness gates
- policy checks
- execution supervision

Agents may orchestrate execution but must not bypass risk.

---

### `apps/web`

Owns:

- Next.js routes
- server actions
- server services
- route-specific mappers
- view models
- UI components
- workstation UX

Forbidden in `apps/web`:

- raw provider calls
- SQL queries
- hidden domain math in components
- execution math in UI
- duplicate shared contracts

---

## 7. Canonical Web Read Pattern

All major screens must follow:

```text
Query → Mapper → Service → Route → UI
```

### Query

Location:

```text
apps/web/server/queries/
```

Responsibilities:

- gather raw domain data
- call package boundaries
- avoid route-specific formatting

---

### Mapper

Location:

```text
apps/web/server/mappers/
```

Responsibilities:

- convert query results into route-specific view models
- format display-ready values
- remove raw provider shapes
- keep components simple

---

### Service

Location:

```text
apps/web/server/services/
```

Responsibilities:

- orchestrate queries and mappers
- expose route-facing contracts
- handle fallback states
- decide what the route receives

---

### Route

Location:

```text
apps/web/app/
```

Responsibilities:

- call service
- choose rendering strategy
- pass view model into UI

Forbidden:

- provider logic
- SQL
- signal math
- execution math

---

### UI

Location:

```text
apps/web/components/
```

Responsibilities:

- presentation
- interaction
- accessibility
- state display

Forbidden:

- domain calculation engines
- provider calls
- execution decisions
- raw financial accounting

---

## 8. Canonical Web Write Pattern

All writes follow:

```text
UI
  → Server Action
  → Zod Validation
  → Domain Service
  → Repository Transaction
  → Read Model Revalidation
```

Rules:

- every write must validate input with Zod
- every write must enforce lane/scope/policy constraints
- every persisted mutation must be auditable
- execution and simulation writes must be transactional
- never mutate portfolio state from UI

---

## 9. Contract-First Development

Before implementing major behavior:

1. Define or extend contracts in `packages/api-contracts`
2. Add repository/domain support in `packages/db`
3. Add provider/ingestion support if data is external
4. Add pure signal/forecasting logic if needed
5. Add agent workflow if execution-related
6. Add service and mapper in `apps/web`
7. Add route and UI
8. Add tests
9. Update docs

Never create duplicate local contracts if shared contracts are appropriate.

---

## 10. Simulation Integrity Rules

Simulation is a persisted execution system, not a visual demo.

Claude must preserve:

- deterministic order validation
- deterministic accounting updates
- transaction-safe state mutation
- explicit lane and asset-scope enforcement
- auditable order history
- auditable transaction history
- portfolio snapshots
- fee tracking
- realized/unrealized PnL correctness

Forbidden:

- randomness in execution math
- approximate balance mutation
- silent portfolio updates
- unlogged state changes
- direct UI portfolio mutation

---

## 11. Live Migration Safety

Until explicitly approved:

- simulation remains default execution target
- live execution remains gated
- autonomous live execution remains disabled
- kill switch behavior must remain available
- paper trading must be preferred before live trading

Any live-path change must include:

- risk implications
- readiness implications
- rollback strategy
- observability touchpoints
- test strategy

---

## 12. AI and Autonomous Trading Constraints

Claude must treat autonomous trading as high risk.

Never assume:

- broker supports requested micro-order size
- fractional trading is available
- all symbols are tradable
- all assets are liquid
- all lanes can become autonomous
- AI confidence is execution permission

Always model:

- min order quantity
- min notional
- tick size
- step size
- broker symbol mapping
- asset kind
- lane-level capital cap
- lane-level risk cap
- lane-level autonomy level

---

## 13. Risk Enforcement Rule

Risk system overrides:

```text
Risk > Policy > Agent > User Request > UI Convenience
```

If risk validation fails:

```text
Do not execute.
```

Risk checks must exist before execution:

- max exposure
- max position size
- max drawdown
- liquidity threshold
- slippage threshold
- instrument constraints
- stop-loss or exit policy where required
- anomaly condition checks

---

## 14. Provider Routing Rules

Provider routing lives in:

```text
packages/providers/src/market/routing.ts
```

Supported market providers may include:

- polygon
- twelve-data
- tiingo
- coingecko
- finnhub
- eodhd

Rules:

- provider fallback must be explicit
- provider health must be observable
- provider response shapes must be normalized
- API keys must stay server-side
- never fake missing data
- stale data must lower confidence

---

## 15. Database Rules

The system uses raw Postgres through the `postgres` driver.

Rules:

- no ORM unless explicitly approved
- migrations are plain SQL
- app tables live in schema `app`
- repositories own SQL access
- DB absence should produce safe stubs where appropriate
- no direct SQL in app routes or components

Migration rules:

- additive changes preferred
- destructive migrations require explicit note
- backfills must be idempotent
- migrations must be safe for existing data

---

## 16. TypeScript Rules

Required:

- TypeScript strict mode
- no `any` unless justified
- no untyped external payloads past boundaries
- Zod validation for boundary inputs
- discriminated unions for execution/risk states
- exhaustive handling for order statuses and asset kinds

Preferred:

- explicit return types for exported functions
- pure functions for domain math
- small modules
- clear naming over clever abstraction

Forbidden:

- hidden `as any`
- broad type assertions to silence errors
- duplicated enum strings across packages
- implicit unknown provider payloads in UI

---

## 17. UI and UX Rules

Aurox UI should feel like a serious financial workstation.

Required:

- accessible markup
- clear loading states
- clear empty states
- clear degraded states
- clear risk warnings
- display data freshness
- distinguish simulation from live
- never hide execution risk
- never imply guaranteed performance

UI components should receive read models.

Do not compute:

- PnL
- position value
- signal score
- risk score
- execution result
- provider fallback state

inside React components unless it is trivial presentation-only formatting.

---

## 18. Documentation Rules

For significant work, update or create docs covering:

- current state
- target state
- invariants
- data flow
- migration plan
- failure modes
- rollback plan
- tests and verification

Preferred docs:

```text
docs/ARCHITECTURE.md
docs/RISK.md
docs/EXECUTION.md
docs/AGENTS.md
docs/SIMULATION_ENGINE.md
docs/BROKER_ADAPTERS.md
docs/MARKET_INTELLIGENCE.md
docs/DATA_PIPELINE.md
```

---

## 19. Testing and Verification

For changed packages, run the narrowest meaningful verification.

Minimum expected:

```bash
pnpm --filter @repo/<changed-package> typecheck
pnpm --filter @repo/<changed-package> test
```

For web route work:

```bash
pnpm build:web
```

For contract changes:

```bash
pnpm --filter @repo/api-contracts typecheck
```

For DB changes:

```bash
node packages/db/scripts/migrate.mjs
pnpm --filter @repo/db typecheck
```

Always report:

- checks run
- checks not run
- failures
- known unrelated baseline failures

Never claim tests passed if they were not run.

---

## 20. Git and Change Discipline

Before editing:

- inspect relevant files
- understand existing patterns
- avoid broad rewrites
- prefer vertical slices
- preserve public contracts unless intentionally changed

After editing:

- summarize files changed
- explain why
- list verification
- list residual risks
- list follow-up tasks

Never make unrelated cosmetic changes during risky execution, DB, or provider work.

---

## 21. Security Rules

Never expose:

- provider API keys
- broker credentials
- DB URLs
- user secrets
- auth tokens

Never commit:

- `.env`
- `.env.local`
- `.claude/settings.local.json`
- generated secrets
- personal account identifiers

Use environment variables only through approved config modules.

---

## 22. Forbidden Behaviors

Claude must not:

- bypass risk validation
- create direct broker execution from UI
- introduce random execution behavior
- fake provider data
- silently ignore failed checks
- hide uncertainty
- write unbounded autonomous trading logic
- move business logic into React components
- create duplicate contracts
- replace architecture with unrequested rewrites
- delete large areas without explicit reason

---

## 23. Implementation Style

Preferred:

- small coherent vertical slices
- additive changes
- explicit types
- pure domain helpers
- route-specific mappers
- typed services
- transactional repositories
- deterministic tests

Avoid:

- enterprise filler
- abstraction for its own sake
- giant god services
- implicit mutable state
- overly clever generics
- unbounded agent autonomy

---

## 24. Agent Operating Protocol

For every task:

1. Identify affected domains
2. Inspect existing files
3. Respect package boundaries
4. Design minimal safe change
5. Implement vertical slice
6. Validate with targeted checks
7. Report clearly

For high-risk domains:

- execution
- simulation
- broker adapters
- risk
- auth
- DB migrations

Claude must plan before editing.

---

## 25. Final Directive

Aurox Intelligence must be built like:

- a hedge fund risk system
- a broker-grade execution backend
- a scientific market intelligence instrument
- a premium financial workstation

If uncertain:

```text
Choose the safest deterministic implementation.
```
