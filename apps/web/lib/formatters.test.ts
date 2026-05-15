import { describe, expect, it } from 'vitest';
import { formatCompactUsd } from './formatters';

describe('formatCompactUsd', () => {
  describe('thousands (K)', () => {
    it('formats 9000 as $9K — no trailing .0', () => {
      expect(formatCompactUsd(9000)).toBe('$9K');
    });

    it('formats 9500 as $9.5K', () => {
      expect(formatCompactUsd(9500)).toBe('$9.5K');
    });

    it('formats 10000 as $10K', () => {
      expect(formatCompactUsd(10000)).toBe('$10K');
    });

    it('formats 10500 as $10.5K', () => {
      expect(formatCompactUsd(10500)).toBe('$10.5K');
    });

    it('formats 1000 as $1K', () => {
      expect(formatCompactUsd(1000)).toBe('$1K');
    });

    it('formats 1100 as $1.1K', () => {
      expect(formatCompactUsd(1100)).toBe('$1.1K');
    });

    it('formats 999999 as $1000K — boundary below 1M', () => {
      expect(formatCompactUsd(999999)).toBe('$1000K');
    });
  });

  describe('millions (M)', () => {
    it('formats 9000000 as $9M — no trailing .0', () => {
      expect(formatCompactUsd(9000000)).toBe('$9M');
    });

    it('formats 9500000 as $9.5M', () => {
      expect(formatCompactUsd(9500000)).toBe('$9.5M');
    });

    it('formats 1000000 as $1M', () => {
      expect(formatCompactUsd(1000000)).toBe('$1M');
    });

    it('formats 1200000 as $1.2M', () => {
      expect(formatCompactUsd(1200000)).toBe('$1.2M');
    });
  });

  describe('billions (B)', () => {
    it('formats 1000000000 as $1B — no trailing .0', () => {
      expect(formatCompactUsd(1000000000)).toBe('$1B');
    });

    it('formats 2500000000 as $2.5B', () => {
      expect(formatCompactUsd(2500000000)).toBe('$2.5B');
    });
  });

  describe('sub-thousand', () => {
    it('formats 0 as $0', () => {
      expect(formatCompactUsd(0)).toBe('$0');
    });

    it('formats 500 as $500', () => {
      expect(formatCompactUsd(500)).toBe('$500');
    });

    it('formats 999 as $999', () => {
      expect(formatCompactUsd(999)).toBe('$999');
    });
  });

  describe('negative values', () => {
    it('formats -9000 as -$9K', () => {
      expect(formatCompactUsd(-9000)).toBe('-$9K');
    });

    it('formats -9500 as -$9.5K', () => {
      expect(formatCompactUsd(-9500)).toBe('-$9.5K');
    });

    it('formats -1000000 as -$1M', () => {
      expect(formatCompactUsd(-1000000)).toBe('-$1M');
    });
  });

  describe('null / undefined / NaN safety', () => {
    it('returns $0 for null', () => {
      expect(formatCompactUsd(null)).toBe('$0');
    });

    it('returns $0 for undefined', () => {
      expect(formatCompactUsd(undefined)).toBe('$0');
    });

    it('returns $0 for NaN', () => {
      expect(formatCompactUsd(NaN)).toBe('$0');
    });

    it('returns $0 for Infinity', () => {
      expect(formatCompactUsd(Infinity)).toBe('$0');
    });

    it('returns $0 for -Infinity', () => {
      expect(formatCompactUsd(-Infinity)).toBe('$0');
    });
  });

  describe('SSR/client determinism — no Intl.compact variance', () => {
    it('produces identical output for the same value across repeated calls', () => {
      const v = 9000;
      const first = formatCompactUsd(v);
      const second = formatCompactUsd(v);
      expect(first).toBe(second);
      expect(first).toBe('$9K');
    });

    it('does not produce trailing .0 for round K values', () => {
      [1000, 2000, 5000, 9000, 10000, 50000, 100000].forEach((v) => {
        const result = formatCompactUsd(v);
        expect(result).not.toMatch(/\.0[KMB]$/);
      });
    });

    it('does not produce trailing .0 for round M values', () => {
      [1_000_000, 5_000_000, 9_000_000].forEach((v) => {
        const result = formatCompactUsd(v);
        expect(result).not.toMatch(/\.0M$/);
      });
    });
  });
});
