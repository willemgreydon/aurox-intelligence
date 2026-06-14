'use client';

import { useActionState } from 'react';
import { changePasswordAction } from '../../server/actions/account-actions';
import { emptyFormState } from '../../server/auth/forms';
import { FormSubmitButton } from '../auth/form-submit-button';

export function PasswordForm() {
  const [state, formAction] = useActionState(changePasswordAction, emptyFormState);

  return (
    <form action={formAction} className="account-form">
      <div className="account-form__header">
        <h2>Password</h2>
        <p>Update your password and automatically refresh the current session while signing out older ones.</p>
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

      <label className="form-field">
        <span>Current password</span>
        <input
          id="account-current-password"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          aria-invalid={state.fieldErrors.currentPassword ? true : undefined}
          aria-describedby={state.fieldErrors.currentPassword ? 'account-current-password-error' : undefined}
        />
        {state.fieldErrors.currentPassword ? <span id="account-current-password-error" className="form-field__error">{state.fieldErrors.currentPassword}</span> : null}
      </label>

      <div className="form-grid form-grid--two">
        <label className="form-field">
          <span>New password</span>
          <input
            id="account-new-password"
            name="nextPassword"
            type="password"
            autoComplete="new-password"
            aria-invalid={state.fieldErrors.nextPassword ? true : undefined}
            aria-describedby={state.fieldErrors.nextPassword ? 'account-new-password-error' : undefined}
          />
          {state.fieldErrors.nextPassword ? <span id="account-new-password-error" className="form-field__error">{state.fieldErrors.nextPassword}</span> : null}
        </label>

        <label className="form-field">
          <span>Confirm new password</span>
          <input
            id="account-confirm-password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            aria-invalid={state.fieldErrors.confirmPassword ? true : undefined}
            aria-describedby={state.fieldErrors.confirmPassword ? 'account-confirm-password-error' : undefined}
          />
          {state.fieldErrors.confirmPassword ? <span id="account-confirm-password-error" className="form-field__error">{state.fieldErrors.confirmPassword}</span> : null}
        </label>
      </div>

      <FormSubmitButton label="Change password" pendingLabel="Updating password..." className="account-form__submit" />
    </form>
  );
}
