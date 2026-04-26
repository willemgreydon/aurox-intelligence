# /dirty-state-audit

## Purpose
Audit uncommitted, untracked, or stale files that may indicate in-progress or abandoned work.

## When to Use
- Starting a new session and unsure what was left in progress
- Before a PR or commit
- When git status shows unexpected changes

## Claude Code Prompt

```text
Audit the current git working state of the Aurox repo.

Steps:
1. Run git status
2. Run git diff --stat HEAD
3. List any untracked files
4. Check if any of these are risky:
   - .env or .env.local (should not be committed)
   - generated files that differ from source
   - migration files that are unapplied
   - test snapshots that are stale
5. Check if there are any TODO comments left in recently touched files

Report:

Dirty State Audit
=================
Uncommitted changes: none / list
Untracked files: none / list
Risk flags:
- .env committed: YES (CRITICAL) / NO
- Unapplied migrations: YES (list) / NO
- Stale test snapshots: YES / NO

In-progress work detected:
- ...

Recommended action:
- Commit: ...
- Stash: ...
- Clean: ...
- Investigate: ...
```

## Validation Commands
```bash
git status
git diff --stat HEAD
git ls-files --others --exclude-standard
```

## Expected Output
Clean summary of working tree state with risk flags.

## Safety Notes
- Read-only. Never delete untracked files without explicit confirmation.
- Flag any .env files found — never commit them.
