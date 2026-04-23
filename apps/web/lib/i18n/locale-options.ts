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
  fr: 'Français',
  es: 'Español',
  it: 'Italiano',
  pt: 'Português',
  nl: 'Nederlands',
  zh: '中文',
  ja: '日本語',
  ko: '한국어',
  ar: 'العربية',
  hi: 'हिन्दी',
};
