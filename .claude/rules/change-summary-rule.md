# Change Summary Rule

## Purpose
After completing any implementation task, a structured summary must be provided covering: what changed, why, what was verified, and what risks remain. This is required for traceability and safe handoff.

## Applies To
- All implementation tasks
- All code reviews and PR descriptions
- All agent-produced changes

## Rule
After every implementation session, provide a summary in this format:

```text
Change Summary
═══════════════════════════════════
What changed:
- File: <path>
  Change: <description>
- File: <path>
  Change: <description>

Why:
<Motivation for the change — business reason, bug, feature>

Package boundaries respected:
- <package>: <what was changed and why boundary was preserved>

Verification performed:
- pnpm --filter @repo/<package> typecheck: PASS / FAIL
- pnpm --filter @repo/<package> test: PASS / FAIL
- pnpm build:web: PASS / FAIL / NOT RUN

Checks not run:
- <package>: not changed

Known unrelated baseline failures:
- apps/web/server/auth/service.test.ts (pre-existing — CLAUDE.md §4)

Residual risks:
- <any area not tested, any assumption made>

Follow-up tasks:
- <what should be done after this>
```

## Forbidden
- Claiming all checks passed when some were not run
- Omitting residual risks
- Not listing follow-up tasks when follow-up is obviously needed
- Summary that only says "done" or "fixed"

## Required Pattern
Every change session must end with this report. No exceptions for "small" changes — small changes in risk or execution packages are not small.

## Validation
The summary itself is the validation artifact. Review it to confirm:
- Changed files match the stated motivation
- Verification section is accurate
- Residual risks are honestly stated

## Good Example
```text
What changed:
- packages/signals/src/momentum.ts: Added RSI NaN guard
Why: NaN RSI was silently producing a 0 score without confidence reduction
Verification: pnpm --filter @repo/signals typecheck → PASS, test → PASS
Residual risks: MACD indicator has a similar potential NaN path — not fixed in this session
Follow-up: Audit all indicators for NaN handling in packages/signals/src/indicators/
```

## Bad Example
```text
"Fixed the signal bug. Tests pass."
— Missing: what file changed, what the bug was, which tests, what risks remain
```

## Safety Notes
A change summary is not bureaucracy — it is an audit record. When a signal starts producing wrong scores in production, the change summary is how you trace which change introduced the regression and what assumptions were made at the time.
