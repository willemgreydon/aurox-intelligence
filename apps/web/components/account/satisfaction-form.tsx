'use client';

import { useActionState } from 'react';
import type { AccountUserPropertiesViewModel } from '../../server/mappers/user-properties-mapper';
import { submitUserSatisfactionAction } from '../../server/actions/user-properties-actions';
import { emptyFormState } from '../../server/auth/forms';
import { FormSubmitButton } from '../auth/form-submit-button';

const NPS_OPTIONS = Array.from({ length: 11 }, (_, index) => index); // 0–10
const CSAT_OPTIONS = [1, 2, 3, 4, 5];

export function SatisfactionForm({ viewModel }: { viewModel: AccountUserPropertiesViewModel }) {
  const [state, formAction] = useActionState(submitUserSatisfactionAction, emptyFormState);
  const { satisfaction } = viewModel;

  return (
    <form action={formAction} className="account-form">
      <div className="account-form__header">
        <h2>Share your feedback</h2>
        <p>
          How likely are you to recommend Aurox, and how satisfied are you overall? At least one rating is required.
        </p>
      </div>

      {state.message ? (
        <div
          role="alert"
          aria-live="polite"
          className={`form-banner form-banner--${state.status === 'error' ? 'error' : 'success'}`}
        >
          {state.message}
        </div>
      ) : null}

      {satisfaction.lastSubmittedLabel ? (
        <p className="form-field__hint">
          Last submitted {satisfaction.lastSubmittedLabel}
          {satisfaction.npsCategoryLabel ? ` · ${satisfaction.npsCategoryLabel}` : ''}.
        </p>
      ) : null}

      <div className="form-grid form-grid--two">
        <label className="form-field">
          <span>Recommendation score (0–10, NPS)</span>
          <select
            id="satisfaction-nps"
            name="npsScore"
            defaultValue={satisfaction.npsScore === null ? '' : String(satisfaction.npsScore)}
            aria-invalid={state.fieldErrors.npsScore ? true : undefined}
          >
            <option value="">Not answered</option>
            {NPS_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          {state.fieldErrors.npsScore ? <span className="form-field__error">{state.fieldErrors.npsScore}</span> : null}
        </label>

        <label className="form-field">
          <span>Overall satisfaction (1–5, CSAT)</span>
          <select
            id="satisfaction-csat"
            name="csatScore"
            defaultValue={satisfaction.csatScore === null ? '' : String(satisfaction.csatScore)}
          >
            <option value="">Not answered</option>
            {CSAT_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="form-field">
        <span>Anything else? (optional)</span>
        <textarea
          id="satisfaction-notes"
          name="satisfactionNotes"
          rows={3}
          defaultValue={satisfaction.notes}
          maxLength={1000}
        />
      </label>

      <FormSubmitButton label="Submit feedback" pendingLabel="Submitting..." className="account-form__submit" />
    </form>
  );
}
