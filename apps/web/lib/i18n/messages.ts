import type { Locale } from '@repo/api-contracts';
import en from './locales/en.json';
import de from './locales/de.json';
import fr from './locales/fr.json';
import es from './locales/es.json';
import it from './locales/it.json';
import pt from './locales/pt.json';
import nl from './locales/nl.json';
import zh from './locales/zh.json';
import ja from './locales/ja.json';
import ko from './locales/ko.json';
import ar from './locales/ar.json';
import hi from './locales/hi.json';
export { supportedLocales, localeLabels } from './locale-options';

export type AppMessages = typeof en;

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends Array<unknown>
    ? T[K]
    : T[K] extends Record<string, unknown>
      ? DeepPartial<T[K]>
      : T[K];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function mergeMessages<T extends Record<string, unknown>>(base: T, patch: DeepPartial<T>): T {
  const result: Record<string, unknown> = { ...base };

  for (const [key, patchValue] of Object.entries(patch)) {
    if (patchValue === undefined) {
      continue;
    }

    const baseValue = result[key];

    if (isRecord(baseValue) && isRecord(patchValue)) {
      result[key] = mergeMessages(baseValue, patchValue);
      continue;
    }

    result[key] = patchValue;
  }

  return result as T;
}

const localePatches: Record<Locale, DeepPartial<AppMessages>> = {
  en,
  de,
  fr,
  es,
  it,
  pt,
  nl,
  zh,
  ja,
  ko,
  ar,
  hi,
};

const messages = {
  en,
  de: mergeMessages(en, de),
  fr: mergeMessages(en, fr),
  es: mergeMessages(en, es),
  it: mergeMessages(en, it),
  pt: mergeMessages(en, pt),
  nl: mergeMessages(en, nl),
  zh: mergeMessages(en, zh),
  ja: mergeMessages(en, ja),
  ko: mergeMessages(en, ko),
  ar: mergeMessages(en, ar),
  hi: mergeMessages(en, hi),
} satisfies Record<Locale, AppMessages>;

export function getMessages(locale: Locale): AppMessages {
  return messages[locale];
}
