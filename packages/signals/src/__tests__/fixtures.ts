// Deterministic, fixed price-series fixtures for signal/indicator tests.
// No Math.random(), no Date.now() — every series is a hand-authored constant so
// expected outputs can be pre-computed and asserted exactly (test-data-rule.md).

/** Empty series — below every indicator's minimum. */
export const TEST_EMPTY_SERIES: number[] = [];

/** Single bar — below the 2-bar minimum for momentum/volatility. */
export const TEST_SINGLE_BAR: number[] = [100];

/** Flat series: all closes equal (zero momentum, zero volatility). */
export const TEST_FLAT_SERIES: number[] = [50, 50, 50, 50, 50];

/** Monotonic uptrend, 5 bars. */
export const TEST_UPTREND_SERIES: number[] = [100, 105, 110, 115, 120];

/** Series with a NaN in the middle (first/last are finite). */
export const TEST_NAN_MIDDLE_SERIES: number[] = [100, NaN, 110, 115, 120];

/** Series whose final value is NaN. */
export const TEST_NAN_LAST_SERIES: number[] = [100, 110, NaN];

/** Series with a non-finite (Infinity) value. */
export const TEST_INFINITY_SERIES: number[] = [100, Number.POSITIVE_INFINITY, 110];
