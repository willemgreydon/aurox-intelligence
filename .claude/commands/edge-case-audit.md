# /edge-case-audit

## Purpose
Identify unhandled edge cases in a specific domain or feature.

## When to Use
- After implementing a new feature
- When bugs from unexpected inputs are appearing
- Before adding a feature to a high-risk domain

## Claude Code Prompt

```text
Audit edge cases for a specific Aurox domain.

Domain to audit: [USER PROVIDES: e.g. "simulation order processing" or "signal score calculation"]

For the target code, check these edge case categories:

1. Empty / null inputs
   - What happens if market data is missing?
   - What happens if price is null?
   - What happens if history array is empty?

2. Boundary values
   - What happens at min/max position size?
   - What happens with zero balance?
   - What happens at exactly the risk threshold?

3. Concurrent operations
   - Can two orders run simultaneously and over-allocate cash?
   - Is there a race condition in portfolio snapshot creation?

4. Provider failure
   - What happens if the price provider returns null mid-execution?
   - Does the system fail safe or continue with stale data?

5. Numeric precision
   - Are there floating point precision issues in PnL calculations?
   - Are fees rounded consistently?

Report:

Edge Case Audit
===============
Domain: <name>

Unhandled edge cases:
- Case: <description>
  Location: <file:line>
  Risk: <what could go wrong>
  Fix: <description>

Cases that are handled well:
- ...

Highest priority to fix:
1. ...
```

## Validation Commands
```bash
pnpm --filter @repo/<package> typecheck
pnpm --filter @repo/<package> test
```

## Expected Output
Ranked list of unhandled edge cases with specific locations and fixes.

## Safety Notes
- Financial edge cases (zero balance, null price) are critical, not minor.
