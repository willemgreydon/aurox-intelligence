// ESM resolve hook: the pure @repo/signals / @repo/forecasting dist bundles use
// TS/bundler-style extensionless relative imports (e.g. "./indicators/rsi"), which
// raw Node ESM cannot resolve. This hook appends ".js" / "/index.js" so the REAL
// compiled packages can be executed from plain-Node maintenance scripts without a
// bundler or tsx. It is a dev/backfill utility only — never imported by the app.
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export async function resolve(specifier, context, next) {
  try {
    return await next(specifier, context);
  } catch (error) {
    if (
      context.parentURL &&
      (specifier.startsWith('.') || specifier.startsWith('/') || specifier.startsWith('file:'))
    ) {
      const base = new URL(specifier, context.parentURL);
      for (const candidate of [base.href + '.js', base.href.replace(/\/$/, '') + '/index.js']) {
        try {
          if (existsSync(fileURLToPath(candidate))) {
            return { url: candidate, shortCircuit: true };
          }
        } catch {
          // ignore and fall through
        }
      }
    }
    throw error;
  }
}
