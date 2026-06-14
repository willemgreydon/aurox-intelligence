'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import type { AppMessages } from '../../lib/i18n/messages';
import { emptyFormState } from '../../server/auth/forms';
import { loginAction } from '../../server/actions/auth-actions';
import { FormSubmitButton } from './form-submit-button';
import { PasswordInput } from './password-input';

type LoginFormProps = {
  nextPath: string | null;
  messages: AppMessages['auth'];
};

export function LoginForm({ nextPath, messages }: LoginFormProps) {
  const [state, formAction] = useActionState(loginAction, emptyFormState);
  const emailError = state.fieldErrors.email;
  const passwordError = state.fieldErrors.password;

  return (
    <form action={formAction} className="auth-form">
      <div className="auth-form__header">
        <h2>{messages.signInShort}</h2>
        <p>{messages.loginFormDescription}</p>
      </div>

      <input type="hidden" name="next" value={nextPath ?? ''} />

      {state.message ? (
        <div
          role="alert"
          aria-live="polite"
          className={`form-banner form-banner--${state.status === 'error' ? 'error' : 'success'}`}
        >
          <span>{state.message}</span>
          {state.status === 'error' ? (
            <Link className="form-banner__link" href="/forgot-password">
              {messages.forgotPassword}
            </Link>
          ) : null}
        </div>
      ) : null}

      <label className="form-field">
        <span>{messages.emailAddress}</span>
        <input
          id="login-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder={messages.emailPlaceholder}
          aria-invalid={emailError ? true : undefined}
          aria-describedby={emailError ? 'login-email-error' : undefined}
        />
        {emailError ? (
          <span id="login-email-error" className="form-field__error">{emailError}</span>
        ) : null}
      </label>

      <label className="form-field">
        <span>{messages.password}</span>
        <PasswordInput
          id="login-password"
          name="password"
          autoComplete="current-password"
          placeholder={messages.passwordPlaceholder}
          ariaInvalid={Boolean(passwordError)}
          ariaDescribedby={passwordError ? 'login-password-error' : undefined}
          showLabel={messages.showPassword}
          hideLabel={messages.hidePassword}
        />
        {passwordError ? (
          <span id="login-password-error" className="form-field__error">{passwordError}</span>
        ) : null}
      </label>

      <Link className="auth-form__forgot" href="/forgot-password">
        {messages.forgotPassword}
      </Link>

      <FormSubmitButton label={messages.signIn} pendingLabel={messages.signingIn} className="auth-form__submit" />

      <p className="auth-form__meta">
        {messages.newHere}{' '}
        <Link href={nextPath ? `/signup?next=${encodeURIComponent(nextPath)}` : '/signup'}>{messages.createAccount}</Link>
      </p>
    </form>
  );
}
