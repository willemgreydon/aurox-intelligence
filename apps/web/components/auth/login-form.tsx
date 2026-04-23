'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import type { AppMessages } from '../../lib/i18n/messages';
import { emptyFormState } from '../../server/auth/forms';
import { loginAction } from '../../server/actions/auth-actions';
import { FormSubmitButton } from './form-submit-button';

type LoginFormProps = {
  nextPath: string | null;
  messages: AppMessages['auth'];
};

export function LoginForm({ nextPath, messages }: LoginFormProps) {
  const [state, formAction] = useActionState(loginAction, emptyFormState);

  return (
    <form action={formAction} className="auth-form">
      <div className="auth-form__header">
        <h2>{messages.signInShort}</h2>
        <p>{messages.loginFormDescription}</p>
      </div>

      <input type="hidden" name="next" value={nextPath ?? ''} />

      {state.message ? (
        <div className={`form-banner form-banner--${state.status === 'error' ? 'error' : 'success'}`}>{state.message}</div>
      ) : null}

      <label className="form-field">
        <span>{messages.emailAddress}</span>
        <input name="email" type="email" autoComplete="email" placeholder={messages.emailPlaceholder} />
        {state.fieldErrors.email ? <span className="form-field__error">{state.fieldErrors.email}</span> : null}
      </label>

      <label className="form-field">
        <span>{messages.password}</span>
        <input name="password" type="password" autoComplete="current-password" placeholder={messages.passwordPlaceholder} />
        {state.fieldErrors.password ? <span className="form-field__error">{state.fieldErrors.password}</span> : null}
      </label>

      <FormSubmitButton label={messages.signIn} pendingLabel={messages.signingIn} className="auth-form__submit" />

      <p className="auth-form__meta">
        {messages.newHere}{' '}
        <Link href={nextPath ? `/signup?next=${encodeURIComponent(nextPath)}` : '/signup'}>{messages.createAccount}</Link>
      </p>
    </form>
  );
}
