# Baseline Failure Rule

## Purpose
Some failures in the repository are pre-existing and unrelated to current changes. These must be documented and never confused with introduced regressions. Treating a known baseline as a new failure wastes time. Treating a new failure as a baseline can ship broken code.

## Applies To
- All verification and testing workflows
- All agents and human developers

## Rule
**Current known baseline failure:**

```text
File: apps/web/server/auth/service.test.ts
Type: TypeScript typing inconsistency
Status: Pre-existing — do not treat as introduced failure
Rule (CLAUDE.md §4): Never rely on full apps/web typecheck as truth
```

When encountering this failure:
1. Note it as "known baseline — pre-existing"
2. Do not attribute it to current changes
3. Do not attempt to fix it unless explicitly assigned to fix it
4. Do not hide it — surface it in verification reports as a baseline item

When discovering a NEW failure:
1. Determine whether the failure existed before the current session's changes
2. Check git blame/history to see if the file was recently changed
3. If pre-existing: document it in CLAUDE.md §4 as a new baseline entry
4. If introduced by current changes: treat as a blocker to fix

The baseline section in CLAUDE.md must be kept current. If a baseline is fixed, remove it. If a new pre-existing failure is discovered, add it.

## Forbidden
- Reporting `apps/web/server/auth/service.test.ts` as a regression caused by current changes
- Fixing the baseline failure silently without removing it from the documented baseline
- Adding new code that makes the baseline worse
- Documenting a failure as "baseline" without verifying it pre-dates the current session

## Required Pattern
```text
Verification report:
─────────────────────────��───────────────────
Checks run:
- pnpm --filter @repo/signals typecheck: PASS
- pnpm --filter @repo/signals test: PASS

Checks not run: agents, db (not modified)

Known unrelated baseline failures (not introduced by this session):
- apps/web/server/auth/service.test.ts: typing issue — pre-existing per CLAUDE.md §4

New failures introduced by this session:
- none
─────────────────────────────────────────────
```

## Validation
```bash
# Verify the baseline failure still exists and is not worse
pnpm --filter @repo/... typecheck 2>&1 | grep "auth/service.test.ts"
```

## Good Example
```text
"apps/web/server/auth/service.test.ts error is the known pre-existing baseline. Not caused by current changes."
```

## Bad Example
```text
"Found 1 TypeScript error in auth service — I fixed all errors including this one in my change."
(Unless that fix was explicitly requested — touching known baselines silently changes scope.)
```

## Safety Notes
Silently fixing a baseline failure while working on an unrelated task expands the change surface. A fix that passes typecheck may introduce a behavior change in the auth service that breaks login flows. Baseline fixes must be intentional and explicitly scoped.
