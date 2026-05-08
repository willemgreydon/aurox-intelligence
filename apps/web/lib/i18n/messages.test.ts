import { describe, expect, it } from 'vitest';
import en from './locales/en.json';
import de from './locales/de.json';
import fr from './locales/fr.json';
import es from './locales/es.json';
import itLocale from './locales/it.json';
import pt from './locales/pt.json';
import nl from './locales/nl.json';
import zh from './locales/zh.json';
import ja from './locales/ja.json';
import ko from './locales/ko.json';
import ar from './locales/ar.json';
import hi from './locales/hi.json';

function flattenKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const output: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const next = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      output.push(...flattenKeys(value as Record<string, unknown>, next));
    } else {
      output.push(next);
    }
  }
  return output;
}

describe('i18n locale key parity', () => {
  const base = new Set(flattenKeys(en as Record<string, unknown>));
  const locales = { de, fr, es, it: itLocale, pt, nl, zh, ja, ko, ar, hi };

  for (const [name, locale] of Object.entries(locales)) {
    it(`${name} does not include unknown keys`, () => {
      const keys = flattenKeys(locale as Record<string, unknown>);
      const unknown = keys.filter((key) => !base.has(key));
      expect(unknown).toEqual([]);
    });
  }
});
