# Test Data Rule

## Purpose
Tests for financial logic must use realistic, deterministic, fixed fixture data — not random values. Test fixtures must cover normal cases, boundary values, and financial edge cases. Tests must never rely on live provider data.

## Applies To
- `packages/signals/`
- `packages/forecasting/`
- `packages/agents/`
- `packages/db/`

## Rule
Test data requirements:

### Signal and Indicator Tests
- Use fixed OHLCV arrays with known expected outputs
- Test minimum bars (exactly MIN_BARS)
- Test below minimum bars (MIN_BARS - 1)
- Test with flat price series (all closes equal)
- Test with zero volume
- Test with NaN in input (should throw or return confidence: 0)

### Simulation Order Tests
- Use fixed account balance and position state
- Test: buy order → verify cash deducted, position created
- Test: sell order → verify cash added, position reduced
- Test: insufficient cash → verify rejection
- Test: below min_qty → verify rejection
- Test: exact account balance edge (can afford exactly this order)

### Financial Fixture Conventions
```ts
// Fixed realistic test data
export const TEST_OHLCV_20_BARS: OHLCV[] = [
  { timestamp: 1700000000000, open: 180.00, high: 182.50, low: 179.20, close: 181.30, volume: 45000000, symbol: "AAPL", assetKind: "stock", interval: "1d", provider: "test" },
  // ... 19 more bars
]

export const TEST_SIMULATION_ACCOUNT: SimulationAccount = {
  id: "test-account-1",
  cashBalance: 10000,
  initialBalance: 10000,
  executionMode: "simulation"
}
```

## Forbidden
- `const prices = Array.from({ length: 20 }, () => Math.random() * 200)` — random data
- Tests that only test the happy path
- Tests that call live provider APIs
- Tests that share mutable state between test cases
- Fixture data with hardcoded `Date.now()` (use fixed timestamps)

## Required Pattern
```ts
// packages/signals/src/indicators/rsi.test.ts
import { computeRSI, RSI_MIN_BARS } from "./rsi"
import { TEST_OHLCV_20_BARS } from "../../test/fixtures"

describe("computeRSI", () => {
  it("returns expected RSI for known input", () => {
    const closes = TEST_OHLCV_20_BARS.map(b => b.close)
    const rsi = computeRSI(closes)
    expect(rsi).toBeCloseTo(58.3, 1)  // pre-computed expected value
  })

  it("throws InsufficientDataError when fewer than MIN_BARS", () => {
    const closes = TEST_OHLCV_20_BARS.slice(0, RSI_MIN_BARS - 1).map(b => b.close)
    expect(() => computeRSI(closes)).toThrow(InsufficientDataError)
  })

  it("handles flat price series (avgLoss=0)", () => {
    const flatCloses = Array(20).fill(100)
    expect(computeRSI(flatCloses)).toBe(100)  // all gains, no losses
  })
})
```

## Validation
```bash
pnpm --filter @repo/signals test
grep -r "Math\.random\|Date\.now()" packages/signals/src packages/forecasting/src --include="*.test.ts"
grep -r "fixtures\|testData\|TEST_" packages/signals/src/test packages/agents/src/test --include="*.ts"
```

## Good Example
```ts
const rsi = computeRSI(KNOWN_CLOSES_20_BARS)
expect(rsi).toBeCloseTo(62.4, 1)  // exact expected value
// ✓ Deterministic test with pre-computed expected value
```

## Bad Example
```ts
const prices = Array.from({ length: 20 }, () => Math.random() * 200)
const rsi = computeRSI(prices)
expect(rsi).toBeGreaterThan(0)   // ✗ Random input, useless assertion
```

## Safety Notes
A test with random input can pass 99% of the time and fail on a specific edge case that only appears in production. Financial logic tests must be deterministic — they are the only way to guarantee a formula change does not silently break correct behavior.
