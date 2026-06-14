import type { PreTradeRiskGateViewModel } from '../../lib/pre-trade-risk-view';

type SimulationRiskGateSummaryProps = {
  gate: PreTradeRiskGateViewModel;
};

const STATUS_GLYPH = { PASSED: '✓', FAILED: '✕', NEEDS_APPROVAL: '!' } as const;

/**
 * Pre-trade risk gate summary (AUR-018). Pure presentation of a server-computed
 * read model — pass/fail per deterministic check. No risk logic lives here.
 */
export function SimulationRiskGateSummary({ gate }: SimulationRiskGateSummaryProps) {
  const headlineTone = gate.canSubmit ? 'success' : 'danger';
  const headlineLabel = gate.canSubmit
    ? 'Risk gate clear'
    : `Risk gate blocked (${gate.failedCount})`;

  return (
    <section className="risk-gate" aria-label="Pre-trade risk gate">
      <div className="risk-gate__header">
        <h4 className="risk-gate__title">Pre-trade risk gate</h4>
        <span className={`status-pill status-pill--${headlineTone}`}>{headlineLabel}</span>
      </div>
      <ul className="risk-gate__list">
        {gate.checks.map((check) => (
          <li key={check.id} className="risk-gate__item">
            <span
              className={`risk-gate__pill status-pill status-pill--${check.tone}`}
              aria-hidden="true"
            >
              {STATUS_GLYPH[check.status]}
            </span>
            <span className="risk-gate__label">
              <strong>{check.label}</strong>
              <span className="risk-gate__reason">{check.reason}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="risk-gate__footnote">
        Quantity-dependent checks (per-trade limit, concentration) are validated when you submit.
      </p>
    </section>
  );
}
