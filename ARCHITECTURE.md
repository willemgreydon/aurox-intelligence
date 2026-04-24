# ARCHITECTURE.md — AUROX INTELLIGENCE

**Version:** 2.0 (System Blueprint)
**Role:** Full System Architecture, Data Flow & Design Doctrine

---

# 1. SYSTEM OVERVIEW

Aurox Intelligence is a **deterministic financial intelligence and execution platform** built as a modular monorepo.

It combines:

* Real-time market data ingestion
* Signal generation and factor modeling
* AI-assisted intelligence
* Risk-controlled execution
* Simulation-first trading infrastructure

---

## 1.1 System Philosophy

The system is designed as:

```text
Data → Signals → Intelligence → Risk → Execution → Portfolio → Reporting
```

NOT:

```text
UI → API → DB
```

---

## 1.2 Architectural Principles

* Deterministic-first
* Modular boundaries
* Contract-driven design
* Pure function pipelines
* Simulation-first execution
* Explainability over opacity

---

# 2. HIGH-LEVEL SYSTEM DIAGRAM

```text
                ┌───────────────────────┐
                │       UI Layer        │
                │    (Next.js App)      │
                └──────────┬────────────┘
                           │
                ┌──────────▼───────────┐
                │   Service Layer      │
                │ (server/services)    │
                └──────────┬───────────┘
                           │
       ┌───────────────────┼────────────────────┐
       ▼                   ▼                    ▼
┌──────────────┐  ┌────────────────┐  ┌────────────────────┐
│  Signals     │  │ Intelligence   │  │  Agents            │
│ (pure)       │  │ (AI + ranking) │  │ (execution logic)  │
└──────┬───────┘  └──────┬─────────┘  └──────────┬─────────┘
       │                 │                       │
       ▼                 ▼                       ▼
┌──────────────┐  ┌────────────────┐  ┌────────────────────┐
│ Forecasting  │  │ Risk Engine    │  │ Broker Adapters    │
│ (pure)       │  │                │  │                    │
└──────┬───────┘  └──────┬─────────┘  └──────────┬─────────┘
       │                 │                       │
       ▼                 ▼                       ▼
        ┌────────────────────────────────────────┐
        │         Data Layer (DB + Providers)    │
        └────────────────────────────────────────┘
```

---

# 3. MONOREPO STRUCTURE

```text
apps/
  web/                         # Next.js App Router UI + orchestration

packages/
  api-contracts/               # Zod schemas + TS types (single source of truth)
  db/                          # Postgres access, repositories, migrations
  providers/                   # External APIs (market, macro, crypto, etc.)
  signals/                     # Pure signal computation
  forecasting/                 # Pure predictive logic
  agents/                      # Trade workflows + execution routing
  ai-market-intelligence/      # AI composition + ranking logic
  observability/               # Logging, metrics, tracing
  design-tokens/               # UI tokens (CSS + TS)
```

---

# 4. LAYERED ARCHITECTURE

## 4.1 Data Layer

### Responsibilities

* Fetch external data
* Normalize provider responses
* Persist critical data

### Components

* `providers`
* `db`

---

## 4.2 Feature Layer

### Responsibilities

* Transform raw data into usable features

### Examples

* Moving averages
* Volatility metrics
* Derived ratios

---

## 4.3 Signal Layer

### Responsibilities

* Generate trading signals

### Characteristics

* Pure functions
* Deterministic
* No side effects

---

## 4.4 Intelligence Layer

### Responsibilities

* Combine signals, factors, and AI outputs

### Outputs

* Ranking
* Recommendations
* Confidence scores

---

## 4.5 Risk Layer

### Responsibilities

* Evaluate all decisions
* Enforce constraints
* Block unsafe actions

---

## 4.6 Execution Layer

### Responsibilities

* Translate decisions into orders
* Route to simulation or broker
* Manage lifecycle

---

## 4.7 Reporting Layer

### Responsibilities

* Performance tracking
* Risk analytics
* Strategy reporting

---

# 5. DATA FLOW ARCHITECTURE

## 5.1 Read Flow

```text
Providers → DB → Query → Mapper → Service → Route → UI
```

---

## 5.2 Write Flow

```text
UI → Server Action → Validation → Domain Service → Repository → DB
```

---

## 5.3 Execution Flow

```text
Signals → Intelligence → Risk → Agents → Execution → Portfolio Update
```

---

# 6. DOMAIN PACKAGES — RESPONSIBILITIES

## 6.1 api-contracts

* Zod schemas
* Type definitions
* Shared contracts

---

## 6.2 db

* SQL queries
* Repositories
* Transactions
* Migrations

---

## 6.3 providers

* External APIs
* Fallback logic
* Data normalization

---

## 6.4 signals

* Technical indicators
* Signal scoring

---

## 6.5 forecasting

* Predictive models
* Time series outputs

---

## 6.6 agents

* Trade workflows
* Execution orchestration
* Policy enforcement

---

## 6.7 ai-market-intelligence

* AI aggregation
* Decision enrichment
* Ranking systems

---

## 6.8 observability

* Logging
* Metrics
* Tracing

---

# 7. EXECUTION ARCHITECTURE

## 7.1 Execution Targets

* Simulation (default)
* Live (future, gated)

---

## 7.2 Broker Abstraction

```ts
interface BrokerAdapter {
  executeOrder(order): Promise<Result>
}
```

---

## 7.3 Execution Modes

* Manual
* Assisted
* Autonomous (future)

---

# 8. SIMULATION SYSTEM

Simulation acts as:

* Testing environment
* Training environment
* Execution validation system

---

## 8.1 Key Properties

* Deterministic
* Fully auditable
* Realistic accounting

---

# 9. RISK INTEGRATION

Risk system is integrated into:

* Signal evaluation
* Trade decision
* Execution approval

---

## 9.1 Enforcement

```text
Risk System > Agents > UI
```

---

# 10. SCALABILITY STRATEGY

## 10.1 Horizontal Scaling

* Worker processes
* Distributed execution

---

## 10.2 Data Scaling

* Read models
* Caching layers
* Streaming pipelines (future)

---

## 10.3 Multi-User Scaling

* Isolated portfolios
* Per-user risk profiles

---

# 11. OBSERVABILITY ARCHITECTURE

## 11.1 Logging

* Structured logs
* Execution logs

## 11.2 Metrics

* Latency
* Success rates
* Risk events

## 11.3 Tracing

* End-to-end execution tracing

---

# 12. FAILURE HANDLING

## 12.1 Types

* Provider failure
* DB failure
* Execution failure

---

## 12.2 Strategy

* Fallback providers
* Safe defaults
* Graceful degradation

---

# 13. SECURITY MODEL

* Input validation (Zod)
* No direct DB exposure
* Controlled execution paths
* API key isolation

---

# 14. DEPLOYMENT ARCHITECTURE

## Frontend

* Vercel

## Backend

* Node services

## Database

* Postgres (Neon)

---

# 15. FUTURE ARCHITECTURE

* Real-time data streams (WebSockets)
* ML pipelines
* Multi-agent systems
* Autonomous execution
* Strategy marketplace

---

# 16. ARCHITECTURAL INVARIANTS

These must NEVER be broken:

* Deterministic execution
* Clear package boundaries
* Contract-first development
* Risk-first enforcement
* Simulation-first approach

---

# 17. SYSTEM EVOLUTION STRATEGY

## Phase 1

* Simulation + analytics

## Phase 2

* Assisted trading

## Phase 3

* Broker integration

## Phase 4

* Autonomous trading

---

# 18. FINAL DIRECTIVE

Aurox is not a typical app.

It is:

→ A financial intelligence engine
→ A risk-controlled execution system
→ A simulation-driven trading platform

---

Every architectural decision must answer:

* Is it deterministic?
* Is it safe?
* Is it explainable?
* Does it scale?

---

# 19. SYSTEM MINDSET

Build like:

* A hedge fund system
* A broker backend
* A scientific instrument

---

If unclear:

```text
Choose the safest architecture
```
