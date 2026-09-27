import { defineConfig } from 'vitest/config';

/**
 * Unit tests only. The Playwright e2e specs under `e2e/` use `*.spec.ts` and the
 * Playwright runner — restricting Vitest to `*.test.ts(x)` keeps them out of the
 * unit run (default excludes such as node_modules are preserved).
 */
export default defineConfig({
  test: {
    include: ['**/*.test.{ts,tsx}'],
  },
});
