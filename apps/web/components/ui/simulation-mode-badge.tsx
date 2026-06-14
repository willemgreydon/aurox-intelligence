type SimulationModeBadgeProps = {
  className?: string;
};

/**
 * Persistent "SIMULATION" execution-mode badge (financial-ui-safety-rule.md:
 * the execution mode must always be visible on trade-adjacent surfaces). Uses the
 * info chip token, which meets WCAG AA contrast. Presentational only.
 */
export function SimulationModeBadge({ className }: SimulationModeBadgeProps) {
  return (
    <span
      className={`observe-chip observe-chip--info${className ? ` ${className}` : ''}`}
      title="Simulation only — no live capital"
    >
      SIMULATION
    </span>
  );
}
