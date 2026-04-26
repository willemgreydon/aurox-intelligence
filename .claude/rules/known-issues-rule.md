# Known Issues Rule

## Purpose
Pre-existing failures, known limitations, and temporary workarounds must be documented in CLAUDE.md. Undocumented known issues cause false alarm investigations and erode trust in the CI/testing infrastructure.

## Applies To
- `CLAUDE.md` §4 (Known Baseline Issues)
- All development workflows

## Rule
A known issue must be documented in CLAUDE.md §4 when:
1. A typecheck, test, or lint failure exists that is pre-existing and not introduced by current work
2. A limitation exists in a package that is intentional or deferred
3. A workaround is in place that future developers might try to "fix" incorrectly

Documentation format in CLAUDE.md §4:
```markdown
## 4. Known Baseline Issue

`apps/web/server/auth/service.test.ts` has an existing auth test typing issue.

Rules:
- Do not hide this issue.
- Do not treat unrelated baseline failures as introduced failures.
- Always validate changed packages independently.

Additional known issues:
- `packages/providers/src/coingecko-adapter.ts`: Rate limit handling is basic.
  Status: Known, deferred. Do not treat 429 errors from CoinGecko as regressions.
  Tracking: Not yet a blocker for current functionality.
```

When a known issue is resolved:
1. Remove it from CLAUDE.md §4
2. Note the fix in the commit message or PR description
3. Confirm the removal by re-running the check that was previously failing

## Forbidden
- Discovering a pre-existing failure and leaving it undocumented
- Adding a known issue to CLAUDE.md without also noting it in the relevant code comment
- Using "known issue" as an excuse for not fixing a critical execution or accounting bug
- Documenting as "known" a failure you introduced in the current session

## Required Pattern
When discovering a pre-existing failure:
```text
1. Verify it predates current changes (git log, git blame)
2. Add entry to CLAUDE.md §4:
   - File/location
   - Type (typecheck / test / lint)
   - Description
   - Status (deferred / intentional / pending fix)
3. Include in verification report as "known unrelated baseline"
```

## Validation
```bash
grep -n "Known\|Baseline\|Pre-existing" .claude/CLAUDE.md CLAUDE.md
```

## Good Example
```markdown
## 4. Known Baseline Issues

- `apps/web/server/auth/service.test.ts` — typing issue (pre-existing)
- `packages/providers/src/tiingo-adapter.ts` — missing batch quote support (deferred, tracked)
```

## Bad Example
Just running `pnpm test`, seeing a failure, and silently proceeding without documenting or investigating it. This leaves future developers wondering if the failure is new or old.

## Safety Notes
An undocumented known failure in `packages/agents` means a future developer might spend hours investigating it as a regression. Worse, they might add a workaround that conflicts with the actual fix when it is eventually implemented. Known issues must be visible to everyone working in the codebase.
