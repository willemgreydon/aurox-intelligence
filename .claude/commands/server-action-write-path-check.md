# /server-action-write-path-check

## Purpose
Verify that a write operation follows the canonical UI → Server Action → Zod → Service → Repository → Revalidation pattern.

## When to Use
- After adding a new form submission or mutation
- When a write operation is failing silently
- When reviewing a PR that adds server actions

## Claude Code Prompt

```text
Verify the write path for a server action in Aurox.

Action to check: [USER PROVIDES: e.g. "submit simulation trade" or "update portfolio settings"]

Trace the write path:

1. UI
   - Is the form calling a server action (not a route handler directly)?
   - Is optimistic UI state managed safely?

2. Server Action (apps/web/server/actions/)
   - Is input validated with Zod before any processing?
   - Is the action scoped to the correct user/lane?
   - Is error returned as a typed result (not thrown unhandled)?

3. Domain Service
   - Does the service enforce lane/scope/policy constraints?
   - Is the execution mode checked?

4. Repository / Transaction
   - Is the write wrapped in a DB transaction?
   - Is the audit trail created atomically with the main write?

5. Read Model Revalidation
   - Is revalidatePath() or revalidateTag() called after the write?
   - Does the revalidation scope match what changed?

Report:

Write Path Check: <action name>
================================
Input validation: present / missing
Scope enforcement: present / missing
Execution mode check: present / missing (for trade actions)
DB transaction: present / missing
Audit trail: present / missing
Revalidation: present / missing

Violations:
- ...

Recommended fixes:
1. ...
```

## Validation Commands
```bash
pnpm build:web
pnpm --filter @repo/db typecheck
```

## Expected Output
Step-by-step write path compliance with specific gaps identified.

## Safety Notes
- A write without Zod validation is a security issue.
- A write without revalidation causes stale data bugs.
