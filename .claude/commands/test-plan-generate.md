# /test-plan-generate

## Purpose
Generate a targeted test plan for the current changes or a specific feature.

## When to Use
- After implementing a feature to plan what tests to write
- Before a PR to ensure critical paths are covered
- When test coverage for a domain is missing

## Claude Code Prompt

```text
Generate a test plan for the current changes in Aurox.

Context: [USER PROVIDES: feature name or "current git diff"]

For each changed domain, generate tests covering:

1. Happy path — expected inputs produce expected outputs
2. Edge cases — boundary conditions, minimum values, empty inputs
3. Error cases — invalid inputs, missing data, provider failure
4. Financial invariants — accounting must balance, PnL must be derivable
5. Determinism — same inputs must always produce same outputs

Test locations by domain:
- packages/signals/ → pure unit tests (vitest)
- packages/forecasting/ → pure unit tests (vitest)
- packages/db/ → integration tests with test DB
- packages/agents/ → workflow tests with simulation adapter
- apps/web/ → build check + server action tests

For each test case, provide:
- Test name
- Input setup
- Expected output
- What invariant it protects

Report:

Test Plan
=========
Domain: <name>
Test file: <suggested path>

Tests:
1. <test name>
   Input: <description>
   Expected: <description>
   Invariant: <what breaks if this fails>

Missing test coverage:
- ...

Highest priority tests to write first:
1. ...
```

## Validation Commands
```bash
pnpm --filter @repo/<package> test
```

## Expected Output
Concrete test plan with named test cases and invariants.

## Safety Notes
- Financial invariant tests are highest priority.
- Never mock the DB for accounting tests — use test fixtures.
