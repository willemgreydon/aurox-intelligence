import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@repo/signals': fileURLToPath(new URL('../signals/src/index.ts', import.meta.url)),
    },
  },
});
