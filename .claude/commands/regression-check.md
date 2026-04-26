# /regression-check

## Purpose
Check whether current changes introduce regressions in existing behavior.

## When to Use
- Before pushing a branch
- After a refactor
- When something that worked before is now broken

## Claude Code Prompt

```text
Check for regressions introduced by the current changes.

Steps:
1. Review the current git diff to understand what changed
2. Run the test suite for all changed packages:
   pnpm --filter @repo/<changed-package> test
3. Run typecheck for changed packages
4. Check that public APIs of changed modules still match their contracts
5. Check that no simulation accounting logic was changed in a breaking way
6. Check that no risk check was weakened or removed

For each changed file, ask:
- What behavior did this code have before?
- Does the change preserve that behavior for existing callers?
- Is any previously tested code path now untested?

Report:

Regression Check
================
Changed packages:
- ...

Test results per package:
- @repo/<package>: PASS / FAIL / NOT RUN

Public API changes:
- Breaking: YES / NO (list if yes)

Risk system changes:
- Risk weakened: YES (CRITICAL) / NO

Simulation accounting changes:
- Accounting modified: YES / NO (list if yes)

Potential regressions:
- ...

Safe to merge: YES / NO

Blockers:
- ...
```

## Validation Commands
```bash
pnpm --filter @repo/<changed-package> test
pnpm --filter @repo/<changed-package> typecheck
```

## Expected Output
Per-package test results with specific regression risks identified.

## Safety Notes
- A weakened risk check is always a blocker.
- Untested accounting changes are high-risk.
