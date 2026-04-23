'use client';

import type { AccountUser } from '@repo/api-contracts';
import { useActionState } from 'react';
import { updateProfileAction } from '../../server/actions/account-actions';
import { emptyFormState } from '../../server/auth/forms';
import { FormSubmitButton } from '../auth/form-submit-button';

type ProfileFormProps = {
  user: AccountUser;
};

export function ProfileForm({ user }: ProfileFormProps) {
  const [state, formAction] = useActionState(updateProfileAction, emptyFormState);

  return (
    <form action={formAction} className="account-form">
      <div className="account-form__header">
        <h2>Profile details</h2>
        <p>Keep your name, contact details, and optional avatar current across the platform.</p>
      </div>

      {state.message ? (
        <div className={`form-banner form-banner--${state.status === 'error' ? 'error' : 'success'}`}>{state.message}</div>
      ) : null}

      <label className="form-field">
        <span>Full name</span>
        <input name="name" type="text" defaultValue={user.name} autoComplete="name" />
        {state.fieldErrors.name ? <span className="form-field__error">{state.fieldErrors.name}</span> : null}
      </label>

      <label className="form-field">
        <span>Email address</span>
        <input name="email" type="email" defaultValue={user.email} autoComplete="email" />
        {state.fieldErrors.email ? <span className="form-field__error">{state.fieldErrors.email}</span> : null}
      </label>

      <label className="form-field">
        <span>Avatar URL</span>
        <input
          name="avatarUrl"
          type="url"
          defaultValue={user.avatarUrl ?? ''}
          autoComplete="url"
          placeholder="https://example.com/avatar.png"
        />
        {state.fieldErrors.avatarUrl ? <span className="form-field__error">{state.fieldErrors.avatarUrl}</span> : null}
      </label>

      <FormSubmitButton label="Save profile" pendingLabel="Saving profile..." className="account-form__submit" />
    </form>
  );
}
