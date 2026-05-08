import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const appDir = path.join(process.cwd(), 'app');

const requiredLoadingRoutes = [
  'loading.tsx',
  path.join('market', 'loading.tsx'),
  path.join('observe', 'loading.tsx'),
  path.join('alerts', 'loading.tsx'),
  path.join('replay', '[id]', 'loading.tsx'),
  path.join('signals', 'loading.tsx'),
  path.join('portfolio', 'intelligence', 'loading.tsx'),
  path.join('portfolio', 'loading.tsx'),
  path.join('invest', 'simulation', 'loading.tsx'),
  path.join('invest', 'stocks', 'loading.tsx'),
  path.join('invest', 'etfs', 'loading.tsx'),
  path.join('invest', 'crypto', 'loading.tsx'),
  path.join('invest', 'portfolio', 'loading.tsx'),
  path.join('news', 'loading.tsx'),
  path.join('markets', 'intelligence', 'loading.tsx'),
  path.join('dashboard', 'loading.tsx'),
  path.join('admin', 'loading.tsx'),
  path.join('admin', 'monitoring', 'loading.tsx'),
  path.join('admin', 'monitoring', 'providers', 'loading.tsx'),
  path.join('legal', 'loading.tsx'),
];

describe('loading route coverage', () => {
  it('keeps dedicated loading files for major workstations', () => {
    for (const rel of requiredLoadingRoutes) {
      const full = path.join(appDir, rel);
      expect(existsSync(full), `missing loading route: ${rel}`).toBe(true);
    }
  });

  it('does not use old Market graph placeholder text in route loading files', () => {
    for (const rel of requiredLoadingRoutes) {
      const full = path.join(appDir, rel);
      const content = readFileSync(full, 'utf8');
      expect(content.includes('Market graph')).toBe(false);
    }
  });
});
