# Pre-Push Validation Rule

## Purpose
Before pushing any branch, a defined set of checks must pass. Pushing code with failing typechecks, broken builds, or weakened risk gates is not acceptable regardless of how small the change appears.

## Applies To
- All development workflows before `git push`

## Rule
Pre-push checklist (run in order):

**1. Git status**
```bash
git status
```
- No uncommitted changes? → OK
- Uncommitted changes present → stash or commit before pushing

**2. TypeCheck changed packages**
```bash
pnpm --filter @repo/<changed-package> typecheck
```
- Must PASS for every changed package
- Known baseline: `apps/web/server/auth/service.test.ts` — pre-existing, do not treat as blocker

**3. Tests for changed packages**
```bash
pnpm --filter @repo/<changed-package> test
```
- Must PASS — no new failures

**4. Lint**
```bash
pnpm lint
```
- Should PASS — fix lint errors before pushing

**5. Build (if web changes)**
```bash
pnpm build:web
```
- Must PASS if any `apps/web` files were changed

**Risk checklist (manual verification):**
- [ ] No risk gate removed or weakened
- [ ] No simulation accounting changed without tests
- [ ] No live execution enabled or default changed
- [ ] No provider API keys in code
- [ ] No `.env` file committed

## Forbidden
- Pushing with failing typecheck in a changed package
- Pushing with broken `pnpm build:web` when web files were changed
- Pushing without running tests for execution or simulation changes
- Using `--no-verify` to skip pre-commit hooks

## Required Pattern
Report before every push:
```text
Pre-Push Verification
═════════════════════
Git status: clean
TypeCheck @repo/signals: PASS
Tests @repo/signals: PASS
Lint: PASS
Build: PASS (web changed)

Risk checklist:
- Risk gate intact: YES
- Simulation first: YES
- Live gated: YES
- No secrets: YES

PUSH SAFE: YES
```

## Validation
```bash
git status
pnpm --filter @repo/<changed> typecheck
pnpm --filter @repo/<changed> test
pnpm lint
pnpm build:web
```

## Good Example
All checks pass → push with confidence and a clear report.

## Bad Example
```bash
git push --no-verify  # ✗ Skipping all pre-push checks
```

## Safety Notes
A broken typecheck in `packages/agents` pushed to main means the next developer's build fails immediately. A risk gate change pushed without verification might enable live execution accidentally. Pre-push verification is the last line of defense before code affects the shared branch.
