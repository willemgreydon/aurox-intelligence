#!/usr/bin/env node
/**
 * i18n-check — Translation quality gate for Aurox web app
 *
 * Checks:
 *  1. All non-English locales have the same keys as English (no missing, no unknown)
 *  2. Suspicious hardcoded English strings in page/component TSX files
 *
 * Exit code 0 = clean, non-zero = problems found.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = fileURLToPath(new URL('.', import.meta.url));
const rootDir = resolve(__dir, '..');

// ── 1. locale key parity ────────────────────────────────────────────────────

const localesDir = join(rootDir, 'lib', 'i18n', 'locales');
const localeFiles = readdirSync(localesDir).filter(f => f.endsWith('.json'));

function flattenKeys(obj, prefix = '') {
  const out = [];
  for (const [key, val] of Object.entries(obj)) {
    const next = prefix ? `${prefix}.${key}` : key;
    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      out.push(...flattenKeys(val, next));
    } else {
      out.push(next);
    }
  }
  return out;
}

const en = JSON.parse(readFileSync(join(localesDir, 'en.json'), 'utf8'));
const enKeys = new Set(flattenKeys(en));

let keyErrors = 0;

for (const file of localeFiles) {
  if (file === 'en.json') continue;
  const lang = file.replace('.json', '');
  const locale = JSON.parse(readFileSync(join(localesDir, file), 'utf8'));
  const keys = flattenKeys(locale);
  const keySet = new Set(keys);

  const missing = [...enKeys].filter(k => !keySet.has(k));
  const unknown = keys.filter(k => !enKeys.has(k));

  if (missing.length > 0) {
    console.error(`\n❌  ${lang}: ${missing.length} MISSING key(s):`);
    for (const k of missing) console.error(`     - ${k}`);
    keyErrors += missing.length;
  }
  if (unknown.length > 0) {
    console.error(`\n⚠️   ${lang}: ${unknown.length} UNKNOWN key(s) (not in en.json):`);
    for (const k of unknown) console.error(`     - ${k}`);
    keyErrors += unknown.length;
  }
  if (missing.length === 0 && unknown.length === 0) {
    console.log(`✅  ${lang}: OK (${keySet.size} keys)`);
  }
}

// ── 2. Hardcoded string detection in pages / components ─────────────────────
//
// Heuristic: look for JSX text content that looks like a sentence (capital
// letter, 3+ words) outside of t() calls or {messages.*} patterns.
// Intentionally conservative — we flag probable UI copy, not code strings.

const scanDirs = [
  join(rootDir, 'app'),
  join(rootDir, 'components'),
];

// Patterns that indicate a string IS properly i18n'd — skip these lines
const I18N_OK = [
  /messages\./,          // {messages.foo.bar}
  /labels\./,            // {labels.title}
  /t\(/,                 // t("key") call pattern
  /^\s*\/\//,            // single-line comment
  /^\s*\*/,              // JSDoc comment
  /'use (client|server)'/, // directives
  /console\./,           // console.log etc
  /className=/,          // CSS class strings
  /href=/,               // URL strings
  /aria-/,               // aria attributes
  /placeholder=/,        // covered by labels pattern below
  /^\s*import /,         // imports
  /^\s*export /,         // exports
  /type\s+\w/,           // TS type lines
  /interface\s+\w/,      // TS interface
  /=>/,                  // arrow functions
  /\.(tsx?|css|md)['"]/, // file extensions in strings
  /http(s)?:\/\//,       // URLs
  /\/[a-z]/,             // paths
];

// We flag lines that have a JSX string fragment: >Some text< or {"Some text"}
// with at least 2 words and a capital letter, suggesting visible UI copy.
const HARDCODED_RE = /(?:>|{["'])([A-Z][a-z].*?\s+\w{2,}.*?)(?:<|["']})/g;

function* walkFiles(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      // skip generated / node_modules
      if (['node_modules', '.next', 'dist', '__generated__'].includes(entry)) continue;
      yield* walkFiles(full);
    } else if (['.tsx', '.ts'].includes(extname(entry))) {
      yield full;
    }
  }
}

let hardcodedFindings = 0;
const hardcodedByFile = new Map();

for (const dir of scanDirs) {
  for (const filePath of walkFiles(dir)) {
    const content = readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const findings = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // skip lines that are clearly fine
      if (I18N_OK.some(re => re.test(line))) continue;

      let match;
      HARDCODED_RE.lastIndex = 0;
      while ((match = HARDCODED_RE.exec(line)) !== null) {
        const text = match[1].trim();
        // Ignore very short strings, numeric strings, and template literals
        if (text.length < 6) continue;
        if (/^\d/.test(text)) continue;
        if (text.includes('${')) continue;
        findings.push({ line: i + 1, text });
        hardcodedFindings++;
      }
    }

    if (findings.length > 0) {
      hardcodedByFile.set(relative(rootDir, filePath), findings);
    }
  }
}

if (hardcodedByFile.size > 0) {
  console.error(`\n⚠️   Possible hardcoded UI strings (${hardcodedFindings} occurrence(s) in ${hardcodedByFile.size} file(s)):`);
  for (const [file, findings] of hardcodedByFile) {
    console.error(`\n  ${file}`);
    for (const { line, text } of findings) {
      const preview = text.length > 80 ? text.slice(0, 77) + '...' : text;
      console.error(`    L${String(line).padEnd(5)} "${preview}"`);
    }
  }
  console.error('\n  Review each occurrence — if it is visible UI copy, add it to en.json and wire through labels/messages.');
}

// ── Summary ──────────────────────────────────────────────────────────────────

console.log('');
if (keyErrors > 0 || hardcodedFindings > 0) {
  if (keyErrors > 0) console.error(`❌  Key parity: ${keyErrors} issue(s)`);
  if (hardcodedFindings > 0) console.error(`⚠️   Hardcoded strings: ${hardcodedFindings} possible occurrence(s) — review required`);
  process.exit(keyErrors > 0 ? 1 : 0); // key errors are fatal; hardcoded strings are warnings
} else {
  console.log('✅  All locale checks passed. No key parity issues found.');
  process.exit(0);
}
