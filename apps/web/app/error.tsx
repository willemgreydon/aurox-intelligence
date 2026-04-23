'use client';

import Link from 'next/link';
import { useMemo } from 'react';

const messages = {
  en: {
    eyebrow: 'System state',
    title: 'Something went wrong',
    description:
      'The request could not be completed cleanly. Your data remains protected and you can retry safely.',
    retry: 'Retry',
    dashboard: 'Dashboard',
  },
  de: {
    eyebrow: 'Systemstatus',
    title: 'Etwas ist schiefgelaufen',
    description:
      'Die Anfrage konnte nicht sauber abgeschlossen werden. Ihre Daten bleiben geschützt und Sie können es sicher erneut versuchen.',
    retry: 'Erneut versuchen',
    dashboard: 'Dashboard',
  },
  fr: {
    eyebrow: 'État du système',
    title: 'Une erreur est survenue',
    description:
      "La demande n'a pas pu être finalisée correctement. Vos données restent protégées et vous pouvez réessayer en toute sécurité.",
    retry: 'Réessayer',
    dashboard: 'Tableau de bord',
  },
} as const;

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const locale = useMemo(() => {
    if (typeof document === 'undefined') {
      return 'en';
    }

    const lang = document.documentElement.lang;
    return lang === 'de' || lang === 'fr' ? lang : 'en';
  }, []);

  const copy = messages[locale];

  return (
    <main className="page-main" aria-live="assertive">
      <section className="section section--hero">
        <div className="shell-container">
          <section className="state-panel state-panel--danger">
            <div className="state-panel__body">
              <div className="state-panel__eyebrow">{copy.eyebrow}</div>
              <h2 className="state-panel__title">{copy.title}</h2>
              <p className="state-panel__description">
                {error.digest ? `${copy.description} (${error.digest})` : copy.description}
              </p>
            </div>

            <div className="state-panel__actions">
              <button type="button" onClick={reset} className="button button--primary">
                {copy.retry}
              </button>
              <Link href="/dashboard" className="button button--secondary">
                {copy.dashboard}
              </Link>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}