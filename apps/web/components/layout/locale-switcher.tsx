'use client';

import type { Locale } from '@repo/api-contracts';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { setLocalePreferenceAction } from '../../server/actions/locale-actions';

type LocaleSwitcherProps = {
  locale: Locale;
  label: string;
  compact?: boolean;
};

const locales: Locale[] = ['en', 'de', 'fr'];

export function LocaleSwitcher({ locale, label, compact = false }: LocaleSwitcherProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <div
      className={`locale-switcher${compact ? ' locale-switcher--compact' : ''}`}
      aria-label={label}
      aria-busy={isPending}
    >
      {!compact ? <span className="locale-switcher__label">{label}</span> : null}
      <div className="locale-switcher__options">
        {locales.map((option) => (
          <button
            key={option}
            type="button"
            className={`locale-switcher__option${option === locale ? ' locale-switcher__option--active' : ''}`}
            disabled={isPending}
            onClick={() =>
              startTransition(() => {
                void setLocalePreferenceAction(option).then(() => {
                  router.refresh();
                });
              })
            }
          >
            {option.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
}
