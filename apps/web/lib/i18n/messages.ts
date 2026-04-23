import type { Locale } from '@repo/api-contracts';
import en from './locales/en.json';
import de from './locales/de.json';
import fr from './locales/fr.json';

export type AppMessages = typeof en;

const messages = {
  en,
  de,
  fr,
} satisfies Record<Locale, AppMessages>;

export function getMessages(locale: Locale): AppMessages {
  return messages[locale];
}

export const supportedLocales = ['en', 'de', 'fr'] as const satisfies readonly Locale[];
