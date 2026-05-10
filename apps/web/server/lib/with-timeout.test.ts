import { afterEach, describe, expect, it, vi } from 'vitest';
import { withTimeout } from './with-timeout';

describe('withTimeout', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves with the original promise value when it completes before the timeout', async () => {
    vi.useFakeTimers();
    let resolve!: (v: string) => void;
    const fast = new Promise<string>((r) => { resolve = r; });

    const resultPromise = withTimeout(fast, 1_000, 'fallback');
    resolve('original');
    await vi.advanceTimersByTimeAsync(100);

    expect(await resultPromise).toBe('original');
  });

  it('returns the fallback value when the promise exceeds the timeout', async () => {
    vi.useFakeTimers();
    const neverResolves = new Promise<string>(() => { /* intentionally pending */ });

    const resultPromise = withTimeout(neverResolves, 500, 'fallback');
    await vi.advanceTimersByTimeAsync(600);

    expect(await resultPromise).toBe('fallback');
  });

  it('does not throw from the timeout branch — returns fallback instead', async () => {
    vi.useFakeTimers();
    const neverResolves = new Promise<number>(() => { /* intentionally pending */ });

    const resultPromise = withTimeout(neverResolves, 200, -1);
    await vi.advanceTimersByTimeAsync(300);

    // Must not throw; must resolve cleanly to fallback
    await expect(resultPromise).resolves.toBe(-1);
  });

  it('clears the timer when the original promise wins', async () => {
    vi.useFakeTimers();
    const clearSpy = vi.spyOn(globalThis, 'clearTimeout');

    let resolve!: (v: string) => void;
    const fast = new Promise<string>((r) => { resolve = r; });

    const resultPromise = withTimeout(fast, 5_000, 'fallback');
    resolve('done');
    await vi.advanceTimersByTimeAsync(0);
    await resultPromise;

    // clearTimeout must be called (in the finally block) to avoid a leaked timer
    expect(clearSpy).toHaveBeenCalled();
  });

  it('works correctly with non-string fallback types (object)', async () => {
    vi.useFakeTimers();
    type Item = { id: number; degraded: boolean };
    const fallback: Item = { id: 0, degraded: true };
    const slow = new Promise<Item>(() => { /* never */ });

    const resultPromise = withTimeout(slow, 300, fallback);
    await vi.advanceTimersByTimeAsync(400);

    const result = await resultPromise;
    expect(result).toEqual({ id: 0, degraded: true });
  });

  it('resolves immediately when the timeout is zero (fallback wins)', async () => {
    vi.useFakeTimers();
    const slow = new Promise<string>(() => { /* never */ });
    const resultPromise = withTimeout(slow, 0, 'zero-fallback');
    await vi.advanceTimersByTimeAsync(1);
    expect(await resultPromise).toBe('zero-fallback');
  });
});
