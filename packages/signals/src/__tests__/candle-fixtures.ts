// Deterministic OHLCV fixtures for the candlestick engine. No Math.random(),
// no Date.now() — timestamps are derived from a fixed epoch so every series is
// reproducible and expected outputs can be asserted exactly (test-data-rule.md).
//
// The builders now live in `../candles/lab-scenarios` so the test fixtures and
// the Aurox Lab "Candlestick Annotator" share byte-for-byte identical geometry.
// Re-exported here to preserve every existing test import.
export {
  type BarSpec,
  mkBars,
  flatBase,
  upSeries,
  downSeries,
  zigzag,
} from '../candles/lab-scenarios';
