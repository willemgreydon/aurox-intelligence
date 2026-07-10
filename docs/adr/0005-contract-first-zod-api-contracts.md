# ADR 0005: Contract-first with Zod in `api-contracts`

- Status: Accepted
- Date: 2026-06-19
- Deciders: Aurox core

## Context

Data crosses many boundaries in Aurox: provider responses, DB rows, signal/forecast outputs,
server-action inputs, and UI read models. If each package defines its own version of a shared type,
the definitions drift. A validation change in one place is silently ignored by a duplicate
elsewhere — and in execution flows that means a malformed order can bypass validation and reach a
broker adapter unchecked. We need one place where the shape *and* the runtime validation of shared
domain data are defined together.

## Decision

Develop contract-first: shared schemas and types originate only in `packages/api-contracts`, using
Zod as the single source of truth.

- Any type or schema used by more than one package is a Zod schema in `packages/api-contracts`,
  with its TypeScript type derived via `z.infer`. `db`, `signals`, `forecasting`, `agents`, and
  `apps/web` consume those inferred types; they do not fork or redefine them.
- Route-specific view models that a single route consumes may live in
  `apps/web/server/mappers/`, but their underlying domain types still come from `api-contracts`.
- Boundary inputs are validated with Zod before use. Every server action `.parse()`/`.safeParse()`s
  user input and returns a typed success/error discriminated union before touching a service or the
  DB. Discriminated unions model execution/risk states; order statuses and asset kinds are handled
  exhaustively.
- Before implementing a feature, the contract is defined or extended in `api-contracts` first, then
  wired downward through db → providers/ingestion → signals/forecasting → agents → services →
  routes → UI.

## Consequences

**Positive**

- One canonical definition of each shared shape; a schema change propagates everywhere at once.
- Runtime validation and the static type are guaranteed to agree (type is inferred from the schema).
- Malformed inputs are rejected at the boundary, not deep in execution.
- Contract-first ordering forces interface design before implementation, catching mismatches early.

**Negative**

- Friction for genuinely local, single-use shapes: contributors must decide "shared vs local" and
  resist defining throwaway types in `api-contracts`.
- A change to a widely-used contract ripples across many packages, making some edits larger.
- Zod validation adds a small runtime cost at every boundary (acceptable for safety).

**Risks**

- A duplicated contract inside `apps/web` or a re-exported-then-modified schema silently diverges
  from the canonical one and can let invalid data through; forbidden and grep-validated by the
  api-contracts-boundary rule.
- A server action that skips Zod validation lets malformed trade quantities into the engine;
  forbidden by the server-action-write-path rule.

## Alternatives considered

- **Plain TypeScript interfaces, no runtime validation.** Rejected: types vanish at runtime, so
  untrusted provider/user payloads enter unchecked.
- **Per-package local types.** Rejected: guarantees drift and silent validation gaps across
  packages.
- **Validation only at the UI layer.** Rejected: server actions and services must not trust the
  client; validation belongs at the server boundary.

## References

- [`../../.claude/rules/api-contracts-boundary.md`](../../.claude/rules/api-contracts-boundary.md)
- [`../../.claude/rules/server-action-write-path.md`](../../.claude/rules/server-action-write-path.md)
- [`../../.claude/rules/read-model-rule.md`](../../.claude/rules/read-model-rule.md)
- [`../../.claude/rules/mapper-normalization-rule.md`](../../.claude/rules/mapper-normalization-rule.md)
- Packages: [`packages/api-contracts`](../../packages/api-contracts), [`apps/web/server`](../../apps/web/server)
- See also: ADR 0004 (package boundaries)
