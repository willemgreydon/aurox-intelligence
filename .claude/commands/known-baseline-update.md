# /known-baseline-update

## Purpose
Update the documented known baseline failures so new contributors don't mistake them for introduced regressions.

## When to Use
- When a new pre-existing failure is discovered
- When a known baseline failure is fixed
- Before onboarding a new contributor to avoid confusion

## Claude Code Prompt

```text
Update the Aurox known baseline failure documentation.

Current known baseline:
- apps/web/server/auth/service.test.ts — auth service test has a typing inconsistency (pre-existing, do not treat as introduced failure)

Steps:
1. Run: pnpm typecheck (full) to discover any additional baseline failures
2. Run: pnpm test to discover any test failures that are pre-existing
3. Run: pnpm lint to discover any pre-existing lint warnings
4. For each failure found, determine:
   - Is this new (introduced by recent changes)?
   - Is this pre-existing (was present before this session's changes)?
5. Document pre-existing failures in CLAUDE.md known baseline section
6. Do NOT treat pre-existing failures as introduced

Report:

Known Baseline Update
=====================
Pre-existing failures (not introduced by current changes):
- File: apps/web/server/auth/service.test.ts
  Type: TypeScript error
  Status: known, do not fix in this session

Newly discovered pre-existing failures:
- File: <path>
  Type: <typecheck / test / lint>
  Description: <message>
  Status: <newly documented baseline>

Fixed baseline failures:
- File: <path>
  Status: resolved in this session

Updated CLAUDE.md baseline section: YES / NO
```

## Validation Commands
```bash
pnpm typecheck
pnpm test
pnpm lint
```

## Expected Output
Updated list of known baseline failures to prevent false alarm confusion.

## Safety Notes
- Documenting a baseline failure does not mean it is acceptable long-term.
- Critical failures in execution or accounting code should be fixed, not documented as baseline.
