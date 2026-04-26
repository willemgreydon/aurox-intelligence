# /indicator-model-add

## Purpose
Guide safely adding a new technical indicator or factor model following Aurox signal conventions.

## When to Use
- Adding RSI, MACD, Bollinger Bands, ATR, or custom indicators
- Adding a new factor model component

## Claude Code Prompt

```text
Add a new indicator or factor model to Aurox.

Indicator/model: [USER PROVIDES: e.g. "ATR-based volatility signal"]

Steps:
1. Inspect packages/signals/src/ for existing indicator patterns
2. Implement the indicator as a pure function:
   - Input: OHLCV array or feature array
   - Output: SignalOutput { score, confidence, explanation }
3. Add Zod contract for the indicator output if sharing across packages
4. Handle edge cases: insufficient history, zero values, NaN
5. Add unit tests with known input/output pairs
6. Export from packages/signals/src/index.ts

Rules:
- Must be pure (no I/O)
- Must be deterministic (same inputs → same outputs always)
- Must include explanation string
- Must clamp score to [-1, +1]
- Must clamp confidence to [0, 1]
- Must handle < minimum required bars gracefully (return low confidence)

Report:

Indicator Add Report
====================
Function: <name>
File: packages/signals/src/<file>

Contract: <SignalOutput shape>
Edge cases handled:
- Insufficient history: YES / NO
- Zero values: YES / NO
- NaN propagation: YES / NO

Tests added:
- ...

Verification:
pnpm --filter @repo/signals typecheck
pnpm --filter @repo/signals test
```

## Validation Commands
```bash
pnpm --filter @repo/signals typecheck
pnpm --filter @repo/signals test
```

## Expected Output
Pure deterministic indicator function with tests and contract.

## Safety Notes
- Never add randomness or I/O to packages/signals.
- Low-confidence outputs must not be suppressed — they should surface with low confidence.
