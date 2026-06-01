import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

type DisclosureProps = {
  /** Visible label shown in the always-rendered summary row. */
  summary: string;
  children: ReactNode;
  className?: string;
  /** Optional short hint rendered next to the summary (e.g. a count bubble). */
  hint?: ReactNode;
  /** Render expanded by default. Defaults to collapsed (reveal-on-intent). */
  defaultOpen?: boolean;
};

/**
 * Progressive-disclosure primitive built on native <details>/<summary>.
 *
 * Native elements give us keyboard support (Enter/Space toggle), focus
 * management, and screen-reader semantics for free — no 'use client', no
 * client JS, and it works inside Server Components. Use it to keep secondary
 * content available but not forced into the default view.
 */
export function Disclosure({ summary, children, className, hint, defaultOpen = false }: DisclosureProps) {
  return (
    <details className={cn('home-disclosure', className)} open={defaultOpen}>
      <summary className="home-disclosure__summary">
        <span className="home-disclosure__label">{summary}</span>
        {hint ? <span className="home-disclosure__hint">{hint}</span> : null}
        <span className="home-disclosure__chevron" aria-hidden="true" />
      </summary>
      <div className="home-disclosure__body">{children}</div>
    </details>
  );
}
