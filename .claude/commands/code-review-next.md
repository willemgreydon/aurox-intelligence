# /code-review-next

## Purpose
GODTIER multi-reviewer sweep of the current branch diff. Fans out three
specialized subagents in parallel — Next.js 16 / Turborepo correctness, financial
correctness, and security — then merges their findings into one ranked, deduped
verdict.

## When to Use
- Before opening or merging a PR
- After a vertical slice touching routes, server actions, caching, or contracts
- When a change spans `apps/web` + one or more `packages/*`
- Any time you want a hard second opinion before pushing

## Claude Code Prompt

```text
Run a GODTIER code review of the current branch against main.

Step 1 — establish scope (do this yourself, then hand it to the agents):
- git diff main...HEAD --stat
- git diff main...HEAD --name-only
- Note which packages and which apps/web layers (queries/mappers/services/
  actions/app/components) are touched.

Step 2 — fan out three reviewers IN PARALLEL (one message, multiple Agent calls),
passing each the changed-file list and the diff scope:
- aurox-nextjs-turbo-reviewer — RSC/server-client boundary, caching layers,
  server actions, turbo task-graph + workspace deps, TS/Zod correctness.
- aurox-pr-reviewer — financial correctness, simulation accounting, risk paths.
- aurox-security-reviewer — secrets, auth boundaries, unsafe execution paths.
Each reviews READ-ONLY and returns ranked findings with path:line evidence.

Step 3 — merge:
- Dedupe findings that more than one reviewer raised (keep the highest severity,
  note the corroboration).
- Re-rank globally by blast radius: CRITICAL → HIGH → MEDIUM → LOW → NIT.
- Drop or down-rank anything labeled UNCERTAIN that no second reviewer corroborated.

Step 4 — run only the narrowest verification the diff warrants and report honestly:
- pnpm --filter @repo/<changed-pkg> typecheck | test
- pnpm build:web   (only if apps/web changed)
- pnpm lint

Report in this format:

Aurox GODTIER Code Review
=========================
Scope:
- packages changed: ...
- apps/web layers touched: ...
- checks run: ...

Blockers (CRITICAL / HIGH):
- [SEV] path:line — failure mode → minimal fix  (raised by: agent[, agent])

Non-blockers (MEDIUM / LOW / NIT):
- [SEV] path:line — note → suggestion

Verification:
- pnpm --filter @repo/<pkg> typecheck: PASS / FAIL / NOT RUN
- pnpm build:web: PASS / FAIL / NOT RUN
- pnpm lint: PASS / FAIL / NOT RUN

Known unrelated baseline failures:
- apps/web/server/auth/service.test.ts (pre-existing — CLAUDE.md §4)

Residual risks:
- what was NOT verified

Verdict: BLOCK / APPROVE-WITH-NITS / APPROVE
```

## Validation Commands
```bash
git diff main...HEAD --stat
git diff main...HEAD --name-only
pnpm --filter @repo/<changed-package> typecheck
pnpm build:web
pnpm lint
```

## Expected Output
One merged, deduped, severity-ranked review with a single clear verdict and an
honest verification section.

## Safety Notes
- Read-only review. Reviewers do not patch unless the user explicitly asks.
- Never claim a check passed that was not run.
- Separate introduced findings from the known auth baseline.
- Treat financial-safety findings (cache leaks, missing risk gates, fake data,
  ungated live execution) as CRITICAL regardless of how elegant the code is.
