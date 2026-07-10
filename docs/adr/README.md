# Architecture Decision Records (ADRs)

This folder records the **architecture decisions** that shape Aurox Intelligence. Each ADR
captures one significant, durable choice: the context that forced it, the decision taken, the
consequences (good and bad) we accepted, and the alternatives we rejected.

These ADRs are **descriptive, not aspirational**. Every decision here is already encoded in the
codebase and enforced by a corresponding rule in [`.claude/rules/`](../../.claude/rules/). When a
rule and an ADR disagree, the rule is the executable source of truth and the ADR must be corrected.

---

## What an ADR is

An Architecture Decision Record is a short, immutable document describing a single decision and
why it was made. ADRs are append-only history: we do not rewrite an accepted decision in place. If
a decision changes, we add a **new** ADR that supersedes the old one and update the superseded
record's `Status`.

ADRs answer the question a future engineer (or agent) will ask: *"Why is it built this way, and
what happens if I change it?"*

---

## Lightweight format used here

Every ADR in this folder follows the same minimal structure:

```text
# ADR NNNN: <Title>
- Status: Accepted | Superseded by ADR-XXXX | Deprecated
- Date: YYYY-MM-DD
- Deciders: <who>
## Context          — the forces, constraints, and problem
## Decision         — the choice made, stated plainly
## Consequences     — positive / negative / risks, stated honestly
## Alternatives considered — what we rejected and why
## References       — governing .claude/rules file(s) and relevant docs/packages
```

We keep ADRs short (roughly 60–120 lines). They explain *why*, not *how*; implementation detail
lives in `docs/` and the packages themselves.

---

## Numbering convention

- ADRs are numbered with a zero-padded four-digit sequence: `0001`, `0002`, …
- The number is permanent. Once assigned it is never reused, even if the ADR is superseded.
- Filenames are `NNNN-kebab-case-title.md`.
- A superseding ADR references the one it replaces; the older ADR's `Status` is updated to
  `Superseded by ADR-NNNN` but its content is left intact as history.

---

## Status values

| Status | Meaning |
|---|---|
| `Accepted` | The decision is in force and reflected in the code today. |
| `Superseded by ADR-NNNN` | Replaced by a newer decision; kept for history. |
| `Deprecated` | No longer applies and not replaced; kept for history. |

---

## Index

| ADR | Title | Status | Governing rule(s) |
|---|---|---|---|
| [0001](0001-deterministic-first-philosophy.md) | Deterministic-first philosophy | Accepted | `signal-purity-rule`, `forecasting-purity-rule`, `pure-domain-packages` |
| [0002](0002-simulation-first-execution.md) | Simulation-first execution | Accepted | `simulation-first-rule`, `live-trading-lock`, `broker-sandbox-rule` |
| [0003](0003-raw-postgres-no-orm.md) | Raw Postgres, no ORM | Accepted | `db-boundary`, `repository-transaction-rule` |
| [0004](0004-monorepo-package-boundaries.md) | Monorepo package boundaries | Accepted | `architecture-boundaries`, `provider-boundary`, `app-orchestration-boundary` |
| [0005](0005-contract-first-zod-api-contracts.md) | Contract-first with Zod in `api-contracts` | Accepted | `api-contracts-boundary`, `server-action-write-path` |
| [0006](0006-pure-signals-forecasting-packages.md) | Pure `signals` and `forecasting` packages | Accepted | `pure-domain-packages`, `signal-purity-rule`, `forecasting-purity-rule` |
| [0007](0007-provider-fallback-and-no-fake-data.md) | Provider fallback and no fake market data | Accepted | `no-fake-market-data`, `provider-fallback-rule`, `rate-limit-rule` |
| [0008](0008-risk-gates-and-kill-switch.md) | Risk gates and kill switch on every execution path | Accepted | `risk-gates-required`, `kill-switch-rule`, `execution-safety` |

---

## Relationship to other docs

ADRs sit above the topic docs. They record the *decisions*; the topic docs record the *current
state* of each subsystem:

- [`docs/EXECUTION.md`](../EXECUTION.md) — execution model and staged live progression
- [`docs/RISK.md`](../RISK.md) — risk guards and enforcement wiring
- [`docs/SIMULATION_ENGINE.md`](../SIMULATION_ENGINE.md) — the simulation ledger
- [`docs/AGENTS.md`](../AGENTS.md) — agent workflows and broker supervision
- [`docs/architecture/`](../architecture/) — package map and system overview
- [`.claude/rules/`](../../.claude/rules/) — the executable, enforced version of these decisions
