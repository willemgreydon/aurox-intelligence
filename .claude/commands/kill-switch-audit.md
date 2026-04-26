# /kill-switch-audit

## Purpose
Verify the emergency kill switch mechanism is present, accessible, and correctly halts all execution.

## When to Use
- Before enabling any live or autonomous execution
- After changes to agent workflow code
- As part of a release checklist for any execution-related work

## Claude Code Prompt

```text
Audit the Aurox kill switch and emergency stop mechanisms.

Check for:
1. Is there a kill switch flag or mechanism in packages/agents/?
2. Does the kill switch halt ALL execution lanes when triggered?
3. Can the kill switch be triggered without code deployment (env var, DB flag, or API)?
4. Is the kill switch checked at the start of every agent workflow run?
5. Is the kill switch state logged when triggered?
6. Is there a UI or admin control to trigger the kill switch?
7. Does the kill switch prevent new orders while preserving existing state?

Check the supervisor agent if present:
8. Is the supervisor checking kill switch state?
9. Is kill switch activation an observable event?

Report:

Kill Switch Audit
=================
Kill switch present: YES / NO
Activation method: <env var / DB flag / API / none>
Halts all execution: YES / NO
Checked per workflow run: YES / NO
Logged on activation: YES / NO
UI/admin control: PRESENT / MISSING

Gaps:
- ...

Risk if missing:
- No way to stop execution without code deployment (CRITICAL)

Recommended implementation:
1. ...
```

## Validation Commands
```bash
pnpm --filter @repo/agents typecheck
```

## Expected Output
Kill switch coverage assessment with specific gaps and implementation recommendations.

## Safety Notes
- A missing kill switch is a critical safety gap for any execution-enabled system.
- Kill switch must halt execution, not just slow it down.
