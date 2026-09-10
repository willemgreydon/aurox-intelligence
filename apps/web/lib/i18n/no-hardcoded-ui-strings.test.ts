import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * AUR-049 regression guard. Each file listed here has been fully internationalised
 * — every user-facing string comes from the message catalog. This test fails if a
 * hardcoded user-facing string literal is reintroduced. Add a component here once
 * it is i18n-clean; the list grows as the hardcoded-string extraction proceeds.
 */
const I18N_CLEAN_FILES = [
  'components/layout/footer.tsx',
  'app/dashboard/page.tsx',
  'app/invest/simulation/page.tsx',
  'components/observe/observe-workstation.tsx',
  'components/signals/signals-cockpit.tsx',
  'app/portfolio/intelligence/page.tsx',
];

const UI_ATTRS = 'label|title|placeholder|alt|aria-label|subtitle|eyebrow|description|detail|note|emptyMessage';

// Heuristics for hardcoded user-facing text. Tuned to ignore className/href/keys:
// (1) JSX attribute   attr="English…"   (double-quoted string literal)
// (2) object literal   attr: 'English…' (single-quoted)
// (3) multi-word JSX text nodes starting with a capital letter.
const PATTERNS: Array<{ name: string; re: RegExp }> = [
  { name: 'JSX attr ="Text"', re: new RegExp(`\\b(?:${UI_ATTRS})\\s*=\\s*"[A-Z][A-Za-z][^"]*"`, 'g') },
  { name: "obj attr: 'Text'", re: new RegExp(`\\b(?:${UI_ATTRS})\\s*:\\s*'[A-Z][A-Za-z][^']*'`, 'g') },
  { name: '>Multi Word Text<', re: />\s*[A-Z][A-Za-z]+(?: [A-Za-z&]+){1,8}\s*</g },
];

describe('AUR-049: i18n-clean files contain no hardcoded user-facing strings', () => {
  for (const rel of I18N_CLEAN_FILES) {
    it(`${rel}`, () => {
      const src = readFileSync(join(process.cwd(), rel), 'utf8');
      const findings: string[] = [];
      for (const { name, re } of PATTERNS) {
        for (const match of src.matchAll(re)) {
          findings.push(`${name} -> ${match[0].slice(0, 70).replace(/\s+/g, ' ')}`);
        }
      }
      expect(findings, `Hardcoded UI strings in ${rel}:\n  ${findings.join('\n  ')}`).toEqual([]);
    });
  }
});
