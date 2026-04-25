---
name: aurox-live-readiness-gate
description: Implement readiness checks for any live-capable mode transition.
allowed-tools: Read, Grep, Glob, LS, Edit, MultiEdit, Write, Bash
---
# aurox-live-readiness-gate Skill
## Purpose
Implement readiness checks for any live-capable mode transition.
## When To Use
- Add/modify readiness checks for auth, KYC, broker, risk profile, kill-switch, audit log.
- Changes span query -> mapper -> service -> route -> UI and require architecture-safe delivery.
## When Not To Use
- Pure chart rendering work.
- One-off cosmetic tweaks where no domain logic, risk logic, or typed contracts are affected.
## Required Repo Inspection
1. Inspect current contracts in packages/api-contracts for reusable schemas/types before creating new shapes.
2. Inspect domain logic in focused packages: packages/agents/src/execution/live-readiness-gate.ts; packages/agents/src/readiness/live-readiness-gate.ts; apps/web/app/invest/live-readiness.
3. Inspect web read path (pps/web/server/queries, pps/web/server/mappers, pps/web/server/services) before editing UI routes/components.
4. Inspect existing tests around touched modules and identify required targeted tests.
## Implementation Rules
- Each check must return pass/fail with reason and severity.
- Prefer additive changes over rewrites; keep diffs scoped to the requested behavior.
- Use provider abstraction before provider-specific logic.
- Use execution adapter abstraction before broker-specific logic.
- Keep deterministic logic first, explainability/AI-enrichment second.
- Reuse shared contracts/types and avoid ad-hoc local duplication.
## Safety Rules
- Any failed critical check blocks live mode activation.
- Simulation-first is mandatory unless an explicit live readiness gate is passed.
- No direct live order execution without explicit gate + user confirmation.
- Never commit secrets, API keys, or sensitive credentials.
- On uncertain/partial data, degrade gracefully and surface an explicit warning state.
## Expected Packages And Files To Inspect
- packages/api-contracts
- packages/providers
- packages/signals
- packages/agents
- packages/db
- packages/forecasting
- packages/observability
- pps/web/server/queries
- pps/web/server/mappers
- pps/web/server/services
- pps/web/app
- pps/web/components
- Skill-specific focus: packages/agents/src/execution/live-readiness-gate.ts; packages/agents/src/readiness/live-readiness-gate.ts; apps/web/app/invest/live-readiness
## Expected Output Format
`	ext
Skill: aurox-live-readiness-gate
Scope:
- ...
Contracts/Types:
- created/updated ...
Implementation:
- ...
Safety checks:
- ...
Verification:
- typecheck/test/build commands + result
Residual risks:
- ...
`
## Validation Checklist
- Contracts validated at boundaries (Zod where applicable).
- Query -> mapper -> service -> route -> UI layering preserved.
- No provider calls in UI; no DB queries outside packages/db.
- No hidden side-effects; key decisions are auditable.
- Deterministic behavior verified for critical calculations.
- Fallback path verified for provider failure/partial data.
- If execution-capable flow touched: mode gate + readiness checks verified.
## Aurox Architecture Notes
- Aurox is a financial intelligence and simulation trading system, not generic CRUD.
- Preserve simulation integrity, accounting determinism, and risk-policy enforcement.
- Keep live/autonomous paths explicitly gated and disabled by default unless readiness passes.
- Every recommendation and autonomous/live-capable decision requires explainability + audit trace.
