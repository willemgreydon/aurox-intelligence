import type { ReactNode } from 'react';

/**
 * Single source of truth for the "simulation only — no real money / no broker
 * order / no regulated routing" boundary statement. Standardizes the copy and
 * presentation across the hero, market action area, AI broker panel, and footer
 * so the disclosure never drifts or goes missing.
 *
 * Presentational only (no hooks) → safe in server and client components. All
 * copy is passed in from i18n (`messages.common.simulationDisclosure` for the
 * full statement, `messages.simulation.actions.simulationOnly` for the short
 * label) so the active locale renders consistently.
 */

export type SimulationBoundaryVariant = 'compact' | 'inline' | 'panel' | 'footer';

export type SimulationBoundaryNoticeProps = {
  /** Full disclosure sentence (e.g. messages.common.simulationDisclosure). */
  message: string;
  /** Short pill/eyebrow label (e.g. messages.simulation.actions.simulationOnly). */
  label?: string;
  variant?: SimulationBoundaryVariant;
  className?: string;
  children?: ReactNode;
};

export function SimulationBoundaryNotice({
  message,
  label = 'Simulation only',
  variant = 'inline',
  className,
  children,
}: SimulationBoundaryNoticeProps) {
  const rootClass = [
    'simulation-boundary-notice',
    `simulation-boundary-notice--${variant}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  // `compact` is just the short pill, used inline next to actions.
  if (variant === 'compact') {
    return (
      <span className={rootClass} role="note" aria-label={message} title={message}>
        {label}
      </span>
    );
  }

  return (
    <div className={rootClass} role="note">
      <span className="simulation-boundary-notice__badge status-pill status-pill--info">{label}</span>
      <p className="simulation-boundary-notice__message">{message}</p>
      {children}
    </div>
  );
}
