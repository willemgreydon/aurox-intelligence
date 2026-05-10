'use client';

import { useActionState, useMemo, useState } from 'react';
import { emptyFormState } from '../../server/auth/forms';
import { runSimulationControlAction } from '../../server/actions/simulation-actions';

type SimulationControl = {
  id: 'reset_all' | 'reset_cash_only' | 'close_all_positions' | 'clear_decision_history';
  label: string;
  impact: string;
  confirmToken: string;
  tone: 'danger' | 'secondary';
};

const CONTROLS: SimulationControl[] = [
  { id: 'reset_all', label: 'Reset full simulation portfolio', impact: 'Resets cash, positions, and state journal continuity.', confirmToken: 'RESET ALL', tone: 'danger' },
  { id: 'reset_cash_only', label: 'Reset cash balance only', impact: 'Resets cash to initial simulation value and keeps positions.', confirmToken: 'RESET CASH', tone: 'danger' },
  { id: 'close_all_positions', label: 'Close all simulated positions', impact: 'Creates simulation close events and converts holdings to cash.', confirmToken: 'CLOSE ALL', tone: 'danger' },
  { id: 'clear_decision_history', label: 'Clear decision history', impact: 'Clears AI simulation decision traces and links.', confirmToken: 'CLEAR HISTORY', tone: 'secondary' },
];

export function SimulationControlsCard() {
  const [selected, setSelected] = useState<SimulationControl>(CONTROLS[0] ?? {
    id: 'reset_all',
    label: 'Reset full simulation portfolio',
    impact: 'Resets cash, positions, and state journal continuity.',
    confirmToken: 'RESET ALL',
    tone: 'danger',
  });
  const [confirmText, setConfirmText] = useState('');
  const [state, formAction, pending] = useActionState(runSimulationControlAction, emptyFormState);
  const canSubmit = useMemo(() => confirmText.trim() === selected.confirmToken, [confirmText, selected.confirmToken]);

  return (
    <div className="analytics-card">
      <div className="analytics-card__header">
        <div>
          <div className="section__eyebrow">Simulation Controls</div>
          <h3>Guarded reset actions</h3>
          <p>Simulation-only operational controls. No live broker side effects.</p>
        </div>
      </div>
      <div className="analytics-card__body">
        <div className="market-pagination__actions" style={{ flexWrap: 'wrap' }}>
          {CONTROLS.map((control) => (
            <button key={control.id} type="button" className={`button ${selected.id === control.id ? 'button--primary' : 'button--secondary'}`} onClick={() => setSelected(control)}>
              {control.label}
            </button>
          ))}
        </div>
        <p className="simulation-form__meta simulation-form__meta--warning">{selected.impact}</p>
        <form action={formAction} className="simulation-form">
          <input type="hidden" name="control" value={selected.id} />
          <input type="hidden" name="expectedConfirmText" value={selected.confirmToken} />
          <label className="form-field">
            <span>Type <strong>{selected.confirmToken}</strong> to confirm</span>
            <input name="confirmText" value={confirmText} onChange={(event) => setConfirmText(event.currentTarget.value)} />
          </label>
          <button type="submit" className={`button ${selected.tone === 'danger' ? 'button--danger' : 'button--secondary'}`} disabled={pending || !canSubmit}>
            {pending ? 'Running...' : selected.label}
          </button>
        </form>
        {state.message ? (
          <p className={`simulation-form__meta simulation-form__meta--${state.status === 'success' ? 'success' : 'error'}`}>{state.message}</p>
        ) : null}
      </div>
    </div>
  );
}
