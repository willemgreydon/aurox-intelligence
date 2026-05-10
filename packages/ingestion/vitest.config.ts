import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@repo/api-contracts': fileURLToPath(new URL('../api-contracts/src/index.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
  },
});
