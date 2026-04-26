# /pr-summary

## Purpose
Generate a structured PR description from the current branch changes.

## When to Use
- When opening a PR
- When updating a PR description
- When summarizing changes for code review

## Claude Code Prompt

```text
Generate a PR description for the current branch changes.

Steps:
1. Run git log main..HEAD --oneline to see commits
2. Run git diff main..HEAD --stat to see changed files
3. Run git diff main..HEAD for full diff context

Generate a PR description in this format:

## Summary
[2-4 bullet points describing WHAT changed and WHY]

## Architecture Impact
[How this change affects package boundaries, contracts, data flow]
- Packages changed: ...
- New contracts added: ...
- Read models added/modified: ...

## Risk Assessment
- Simulation accounting affected: YES / NO
- Risk gates affected: YES / NO
- Execution paths affected: YES / NO
- Live trading risk: NONE / LOW / HIGH

## Verification
Checks run:
- pnpm --filter @repo/<package> typecheck: PASS / FAIL / NOT RUN
- pnpm --filter @repo/<package> test: PASS / FAIL / NOT RUN
- pnpm build:web: PASS / FAIL / NOT RUN

Known unrelated baseline failures:
- apps/web/server/auth/service.test.ts (pre-existing)

## Residual Risks
[What was NOT tested or what could still go wrong]

## Follow-up Tasks
[What should be done after this PR merges]
```

## Validation Commands
```bash
git log main..HEAD --oneline
git diff main..HEAD --stat
```

## Expected Output
Complete PR description ready to paste into GitHub.

## Safety Notes
- Never claim verification that was not run.
- Always call out risk-related changes explicitly.
