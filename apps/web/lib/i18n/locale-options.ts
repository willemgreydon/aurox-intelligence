import type { Locale } from '@repo/api-contracts';

export const supportedLocales = [
  'en',
  'de',
  'fr',
  'es',
  'it',
  'pt',
  'nl',
  'zh',
  'ja',
  'ko',
  'ar',
  'hi',
] as const satisfies readonly Locale[];

export const localeLabels: Record<Locale, string> = {
  en: 'English',
  de: 'Deutsch',
  fr: 'Francais',
  es: 'Espanol',
  it: 'Italiano',
  pt: 'Portugues',
  nl: 'Nederlands',
  zh: 'Chinese',
  ja: 'Japanese',
  ko: 'Korean',
  ar: 'Arabic',
  hi: 'Hindi',
};
