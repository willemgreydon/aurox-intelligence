'use client';

import type { Locale } from '@repo/api-contracts';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { setLocalePreferenceAction } from '../../server/actions/locale-actions';
import { localeLabels, supportedLocales } from '../../lib/i18n/locale-options';

type LocaleSwitcherProps = {
  locale: Locale;
  label: string;
  compact?: boolean;
};

export function LocaleSwitcher({ locale, label, compact = false }: LocaleSwitcherProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleLocaleChange = (nextLocale: Locale) => {
    if (nextLocale === locale) {
      return;
    }

    startTransition(() => {
      void (async () => {
        try {
          await setLocalePreferenceAction(nextLocale);
        } finally {
          router.refresh();
        }
      })();
    });
  };

  return (
    <div
      className={`locale-switcher${compact ? ' locale-switcher--compact' : ''}`}
      aria-label={label}
      aria-busy={isPending}
    >
      <label className="locale-switcher__field">
        {!compact ? <span className="locale-switcher__label">{label}</span> : null}
        <select
          className="locale-switcher__select"
          value={locale}
          aria-label={label}
          disabled={isPending}
          onChange={(event) => handleLocaleChange(event.currentTarget.value as Locale)}
        >
          {supportedLocales.map((option) => (
            <option key={option} value={option}>
              {localeLabels[option]}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
