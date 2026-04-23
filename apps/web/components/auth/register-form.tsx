'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import type { AppMessages } from '../../lib/i18n/messages';
import { emptyFormState } from '../../server/auth/forms';
import { registerAction } from '../../server/actions/auth-actions';
import { FormSubmitButton } from './form-submit-button';

type RegisterFormProps = {
  nextPath: string | null;
  messages: AppMessages['auth'];
};

export function RegisterForm({ nextPath, messages }: RegisterFormProps) {
  const [state, formAction] = useActionState(registerAction, emptyFormState);

  return (
    <form action={formAction} className="auth-form">
      <div className="auth-form__header">
        <h2>{messages.createAccountTitle}</h2>
        <p>{messages.registerFormDescription}</p>
      </div>

      <input type="hidden" name="next" value={nextPath ?? ''} />

      {state.message ? (
        <div className={`form-banner form-banner--${state.status === 'error' ? 'error' : 'success'}`}>{state.message}</div>
      ) : null}

      <label className="form-field">
        <span>{messages.fullName}</span>
        <input name="name" type="text" autoComplete="name" placeholder={messages.namePlaceholder} />
        {state.fieldErrors.name ? <span className="form-field__error">{state.fieldErrors.name}</span> : null}
      </label>

      <label className="form-field">
        <span>{messages.emailAddress}</span>
        <input name="email" type="email" autoComplete="email" placeholder={messages.emailPlaceholder} />
        {state.fieldErrors.email ? <span className="form-field__error">{state.fieldErrors.email}</span> : null}
      </label>

      <div className="form-grid form-grid--two">
        <label className="form-field">
          <span>{messages.password}</span>
          <input name="password" type="password" autoComplete="new-password" placeholder={messages.newPasswordPlaceholder} />
          {state.fieldErrors.password ? <span className="form-field__error">{state.fieldErrors.password}</span> : null}
        </label>

        <label className="form-field">
          <span>{messages.confirmPassword}</span>
          <input
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder={messages.confirmPasswordPlaceholder}
          />
          {state.fieldErrors.confirmPassword ? <span className="form-field__error">{state.fieldErrors.confirmPassword}</span> : null}
        </label>
      </div>

      <p className="auth-form__hint">{messages.passwordHint}</p>

      <FormSubmitButton label={messages.createAccount} pendingLabel={messages.creatingAccount} className="auth-form__submit" />

      <p className="auth-form__meta">
        {messages.alreadyRegistered}{' '}
        <Link href={nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : '/login'}>{messages.signIn}</Link>
      </p>
    </form>
  );
}
