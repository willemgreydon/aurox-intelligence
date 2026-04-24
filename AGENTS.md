# AI CODING AGENT RULES — AUROX INTELLIGENCE

**Version:** 2.0 (Enterprise Operating Contract)
**Scope:** All AI agents (Claude, Codex, internal agents, automation scripts)

---

# 1. CORE MISSION

AI agents must evolve Aurox Intelligence as a **financial decision system**, not a generic application.

Every change must be:

* **Architecture-safe** → respects all system boundaries
* **Deterministic where required** → execution, accounting, risk
* **Incremental** → no uncontrolled rewrites
* **Production-realistic** → not theoretical or toy logic
* **Auditable** → every decision traceable
* **Reversible** → rollback must always be possible

---

# 2. SYSTEM IDENTITY (MANDATORY UNDERSTANDING)

Aurox is:

* A financial intelligence engine
* A simulation-based trading system
* A future autonomous trading platform

Aurox is **NOT**:

* A CRUD dashboard
* A UI-first product
* A place for experimental, unbounded AI logic

---

# 3. NON-NEGOTIABLE BOUNDARY RULES

## 3.1 Package Integrity

Agents MUST enforce:

* `packages/api-contracts` → single source of truth
* `packages/db` → all persistence
* `packages/providers` → all external data access
* `packages/signals` → pure signal logic
* `packages/forecasting` → pure predictive logic
* `packages/agents` → execution + orchestration
* `apps/web` → orchestration + UI ONLY

---

## 3.2 Forbidden Violations

❌ No provider calls in UI
❌ No DB queries outside `packages/db`
❌ No business logic in React components
❌ No forecasting logic inside route handlers
❌ No contract duplication across layers
❌ No hidden side-effects

---

## 3.3 Canonicalization Rule

* All symbol normalization, asset typing, and provider harmonization MUST live in ingestion/provider layer
* No duplicate symbol handling logic anywhere else

---

# 4. CANONICAL WEB PATTERN

Mandatory pattern:

```text
Query → Mapper → Service → Route → UI
```

## Enforcement Rules

### Query Layer

* Aggregates raw data
* Calls only domain packages

### Mapper Layer

* Shapes route-specific view models
* No business decisions

### Service Layer

* Orchestrates flows
* Defines output contracts

### Route Layer

* Connects service to UI
* No logic leakage

### UI Layer

* Presentation + interaction ONLY
* No domain math

---

# 5. CONTRACT-FIRST DEVELOPMENT

Before ANY feature:

1. Define schema in `packages/api-contracts`
2. Implement domain/repository support
3. Add service orchestration
4. Connect UI via mapper + route
5. Implement fallback paths

---

## Contract Rules

* Zod validation at all boundaries
* No implicit typing
* No schema duplication
* Backward compatibility must be considered

---

# 6. SIMULATION INTEGRITY RULES (CRITICAL)

Simulation is a **financial accounting engine**.

Agents MUST preserve:

* Deterministic order validation
* Deterministic balance updates
* Transactional consistency
* Explicit asset scope and lane rules
* Full audit trail (orders, transactions, snapshots)

---

## Strict Prohibitions

❌ No randomness in execution math
❌ No approximate accounting
❌ No silent state mutation
❌ No skipping transaction logs

---

# 7. EXECUTION SAFETY RULES

Execution is the **highest-risk layer**.

Agents MUST ensure:

* Idempotent order execution
* No duplicate trades
* Pre-trade validation (risk, liquidity, constraints)
* Post-trade reconciliation

---

## Mandatory Checks Before Execution

* Position sizing valid
* Liquidity sufficient
* Slippage within tolerance
* Risk thresholds respected

---

# 8. LIVE MIGRATION SAFETY RULES

Until explicitly approved:

* Simulation = default execution
* Live execution = gated
* Autonomous trading = disabled

---

## Required for ANY live-related change

* Risk analysis included
* Readiness gate validation
* Kill-switch defined
* Rollback plan documented
* Observability hooks added

---

# 9. AI / AUTONOMOUS TRADING CONSTRAINTS

Agents must treat AI-driven trading as **high-risk infrastructure**.

---

## Never Assume

* Broker supports requested order size
* Fractional trading always allowed
* All assets are equally liquid
* AI confidence = execution permission

---

## Must Always Model

* Min order size / notional
* Tick size / step size
* Asset liquidity profile
* Per-lane capital allocation
* Per-lane autonomy level

---

## AI Constraints

* AI must NEVER bypass risk checks
* AI must produce explainable outputs
* AI must not trigger trades without validation

---

# 10. POLICY & RISK ENFORCEMENT

All trading must pass:

* Risk system validation
* Policy engine rules
* Exposure constraints
* Drawdown limits

---

## Rule

If ANY risk check fails → trade MUST NOT execute

---

# 11. FAILURE HANDLING PRINCIPLES

System must:

* Fail safely (HOLD > execute)
* Provide explicit error reasons
* Avoid cascading failures
* Support partial degradation

---

## Fallback Hierarchy

```text
Live → Simulation → No Execution (Safe Mode)
```

---

# 12. DOCUMENTATION REQUIREMENTS

For any significant change, agents MUST document:

* Current state
* Target state
* Migration plan
* Invariants
* Failure modes
* Rollback strategy

---

## Suggested Locations

```text
docs/
docs/architecture/
docs/execution/
docs/risk/
```

---

# 13. TESTING & VERIFICATION

Minimum requirements:

* Package-level typecheck
* Targeted tests execution
* Validation of affected flows

---

## Reporting Rules

* Known baseline issues must be separated
* Agents must NOT hide failing checks
* Partial failures must be explained

---

# 14. OBSERVABILITY REQUIREMENTS

Agents must integrate:

* Logging for critical flows
* Execution traceability
* Error reporting hooks

---

## Critical Areas

* Trade execution
* Risk validation
* Provider failures
* State transitions

---

# 15. LONG-TERM ENGINEERING DISCIPLINE

Agents must optimize for:

* Maintainability
* Extensibility
* Broker integration readiness
* Multi-asset scalability

---

## Preferred Patterns

* Explicit naming
* Pure functions
* Centralized risk logic
* Clear architecture seams

---

## Anti-Patterns

❌ Clever abstractions without clarity
❌ Hidden coupling
❌ Over-generalization
❌ Premature optimization

---

# 16. CHANGE STRATEGY

Agents must prefer:

* Additive change over rewrite
* Small vertical slices
* Feature flags for risky features
* Backward-compatible evolution

---

# 17. DECISION PRIORITY ORDER

When making trade-offs:

1. Safety
2. Correctness
3. Determinism
4. Observability
5. Performance
6. Convenience

---

# 18. FINAL DIRECTIVE

Agents must operate as:

* Quant engineer
* Risk manager
* System architect
* Backend engineer
* Execution strategist

---

Every line of code must assume:

→ Real capital is at risk
→ Every mistake is measurable
→ Every system decision matters

---

# 19. SYSTEM MINDSET

This is not a playground.

This is:

→ A trading engine
→ A risk system
→ A financial operating system

Act with precision.
