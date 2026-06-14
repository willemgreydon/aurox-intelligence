# CLAUDE.md — AUROX INTELLIGENCE

**Version:** 2.0 (Enterprise System Contract)
**Role:** Authoritative execution + architecture guide for Claude Code & AI agents

---

# 0. TASKBOARD

The canonical project taskboard lives in Notion:

* **Board:** aurox-notion-todo-import.csv (Board – by Epic)
* **URL:** https://app.notion.com/p/mitterbergerlab/37eb7515353580c5a7a1f2ab60860ed0?v=37eb751535358177880a000c19a362a6
* **Database ID:** `37eb7515-3535-8005-bced-000b7b026173` (data source / collection)
* **Schema:** `Name` (title), `Epic` (select), `Size` (S/M/L), `MVP`, `Persona`, `Acceptance Criteria (summary)`, `Source`, `Priority`, `Status` (Todo/Done)

**Rule:** Only write tasks to this board when explicitly instructed in the conversation (e.g. "save this to the board" / "add this to the taskboard"). Do not push tasks to Notion automatically.

---

# 1. SYSTEM PURPOSE

Aurox Intelligence is a **deterministic-first financial intelligence and trading system** designed to:

* Analyze multi-asset markets (stocks, ETFs, crypto)
* Simulate and execute trades
* Generate explainable AI-driven insights
* Enable human + AI co-piloted trading workflows
* Transition safely toward autonomous execution

This repository is **NOT a typical web app**.
It is a **financial decision engine with a UI layer**.

---

# 2. CORE SYSTEM PHILOSOPHY

## 2.1 Deterministic First

* Every output must be reproducible
* No hidden randomness
* All decisions traceable

## 2.2 AI as Augmentation — NOT Authority

* AI suggests, never blindly decides
* AI outputs must include reasoning
* AI must never bypass risk or policy systems

## 2.3 System > Feature Thinking

* Every feature must integrate into:

  * Signal system
  * Risk system
  * Execution system
* No isolated logic allowed

## 2.4 Safety > Performance

* Incorrect trades are worse than missed trades
* All execution paths must fail safely

---

# 3. DEVELOPMENT COMMANDS

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

pnpm test
pnpm lint
pnpm clean
```

Package-level test execution:

```bash
vitest run
```

Turbo filtering:

```bash
pnpm --filter @repo/<package> <script>
```

---

# 4. KNOWN BASELINE ISSUE

`apps/web/server/auth/service.test.ts` contains a typing inconsistency.

### Rule:

* NEVER rely on full `apps/web` typecheck as truth
* ALWAYS validate at package-level boundaries

---

# 5. SYSTEM ARCHITECTURE

## 5.1 Monorepo Layout

```text
apps/
  web/

packages/
  api-contracts/
  db/
  providers/
  signals/
  forecasting/
  agents/
  ai-market-intelligence/
  observability/
  design-tokens/
```

---

## 5.2 HARD BOUNDARY RULES (CRITICAL)

### api-contracts

* Single source of truth for ALL schemas
* Zod-first validation
* No duplication allowed

### db

* ALL persistence logic lives here
* No SQL outside this package

### providers

* ONLY place for:

  * API calls
  * Symbol normalization
  * Provider fallback logic

### signals / forecasting

* PURE FUNCTIONS ONLY
* No I/O
* Deterministic outputs

### agents

* Execution orchestration
* Risk + readiness enforcement
* Broker abstraction layer

### apps/web

* UI + orchestration ONLY
* NO domain logic

---

# 6. DATA FLOW STANDARD

## Read Path (MANDATORY)

```
Query → Mapper → Service → Route → UI
```

### Rules

* UI NEVER computes business logic
* Routes NEVER call providers directly
* Services define the contract

---

## Write Path (MANDATORY)

```
UI → Server Action → Zod Validation → Domain Service → Repository → Read Model Revalidation
```

### Rules

* Every write must be validated
* Every write must be reversible or auditable

---

# 7. FINANCIAL SYSTEM LAYERS

This system implements a **multi-layer intelligence pipeline**:

### 1. Data Layer

* Market data (OHLCV)
* Order book
* On-chain data
* Macro indicators

### 2. Feature Layer

* Indicators
* Transformations
* Derived metrics

### 3. Signal Layer

* Trend signals
* Momentum signals
* Volatility signals
* Mean reversion

### 4. Intelligence Layer

* Ranking engine
* Factor models
* Screening
* Anomaly detection

### 5. Execution Layer

* Trade decision
* Position sizing
* Routing

### 6. Reporting Layer

* Performance metrics
* Risk metrics
* Strategy output

---

# 8. PROVIDER SYSTEM

## Routing

Located in:

```
packages/providers/src/market/routing.ts
```

### Supported Providers

* polygon (default)
* twelve-data
* tiingo
* coingecko
* finnhub
* eodhd

### Responsibilities

* Fallback chaining
* Data normalization
* Provider health checks

---

# 9. DATABASE SYSTEM

* Raw Postgres (no ORM)
* Driver: `postgres`
* Schema: `app`

## Key Rule:

If `DATABASE_URL` is missing → system must still boot (stub client)

## Migrations

* Located in: `packages/db/src/migrations/`
* Applied via `migrate.mjs`

---

# 10. SIMULATION SYSTEM (CORE ENGINE)

Simulation is NOT a mock.
It is a **deterministic financial engine**.

## Tables

* simulation_accounts
* simulation_portfolios
* simulation_positions
* simulation_orders
* simulation_transactions
* simulation_snapshots

## Rules

* No randomness
* Full accounting traceability
* Same logic as live trading

---

# 11. EXECUTION SYSTEM

## Execution Targets

| Mode       | Description |
| ---------- | ----------- |
| Simulation | Default     |
| Live       | Gated       |

---

## Execution Flow

```
Signal → Intelligence → Risk Check → Execution Decision → Broker Adapter
```

---

## Execution Constraints

* Must check:

  * Liquidity
  * Slippage
  * Spread
* Must respect:

  * Position sizing rules
  * Risk thresholds

---

# 12. AGENT SYSTEM

Located in:

```
packages/agents/src/workflows/
```

## Core Workflows

* simulation-trade-workflow.ts
* unified-trade-workflow.ts
* broker-supervisor-agent.ts

---

## Agent Modes

### 1. Manual

User executes trades

### 2. Assisted

AI suggests trades

### 3. Autonomous (FUTURE)

AI executes trades

---

## CRITICAL RULE

Autonomous execution is ONLY allowed if:

* Readiness gate passes
* Risk checks pass
* Broker validated
* Capital verified

---

# 13. RISK MANAGEMENT SYSTEM

## Risk Types

* Market risk
* Liquidity risk
* Counterparty risk
* Operational risk

## Core Metrics

* VaR
* Drawdown
* Volatility
* Expected Shortfall

## Enforcement

* Stop-loss required
* Max exposure per asset
* Portfolio diversification

---

# 14. SIGNAL SYSTEM

## Output Contract

```ts
type SignalOutput = {
  score: number        // -1 to +1
  confidence: number   // 0 to 1
  explanation: string
}
```

## Aggregation

```
Final Signal = Weighted sum of signals
```

---

# 15. AI SYSTEM

## Responsibilities

* Forecasting
* Pattern recognition
* Signal enhancement

## Constraints

* Must be explainable
* Must not overfit
* Must not override deterministic rules

---

# 16. PORTFOLIO SYSTEM

## Strategies

* Equal weight
* Risk parity
* Factor-based allocation

## Constraints

* Max weight per asset
* Liquidity constraints
* Sector limits

---

# 17. TYPE SYSTEM

## Requirements

* TypeScript strict mode
* No `any`
* Zod validation everywhere

## Rule

Types originate ONLY from:

```
packages/api-contracts
```

---

# 18. UI CONTRACT

* UI consumes ONLY read models
* No direct provider usage
* No raw data formatting in components

---

# 19. FAILURE HANDLING

System must gracefully handle:

* Provider failure
* Partial data
* DB absence
* API degradation

Fallback > crash

---

# 20. CONTRACT-FIRST DEVELOPMENT (MANDATORY)

Before implementing ANY feature:

1. Define schema in `api-contracts`
2. Implement DB support
3. Implement service layer
4. Wire into UI
5. Add fallback logic

---

# 21. NON-NEGOTIABLE RULES

❌ No business logic in UI
❌ No provider calls outside providers package
❌ No DB access outside db package
❌ No untyped data flow
❌ No skipping risk validation

---

# 22. FINAL DIRECTIVE

Claude must operate as:

* Senior Quant Engineer
* System Architect
* Risk Manager
* Backend Engineer
* Frontend Systems Designer

Every output must be:

* Production-ready
* Type-safe
* Deterministic
* Explainable
* Scalable

---

# 23. SYSTEM MINDSET

This is not a trading toy.

This is:
→ A decision engine
→ A risk system
→ A financial operating system

Every line of code influences capital.

Act accordingly.
