'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import type { AppMessages } from '../../lib/i18n/messages';
import { emptyFormState } from '../../server/auth/forms';
import { registerAction } from '../../server/actions/auth-actions';
import { FormSubmitButton } from './form-submit-button';
import { PasswordInput } from './password-input';

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
        <div
          role="alert"
          aria-live="polite"
          className={`form-banner form-banner--${state.status === 'error' ? 'error' : 'success'}`}
        >
          {state.message}
        </div>
      ) : null}

      <label className="form-field">
        <span>{messages.fullName}</span>
        <input
          id="register-name"
          name="name"
          type="text"
          autoComplete="name"
          placeholder={messages.namePlaceholder}
          aria-invalid={state.fieldErrors.name ? true : undefined}
          aria-describedby={state.fieldErrors.name ? 'register-name-error' : undefined}
        />
        {state.fieldErrors.name ? <span id="register-name-error" className="form-field__error">{state.fieldErrors.name}</span> : null}
      </label>

      <label className="form-field">
        <span>{messages.emailAddress}</span>
        <input
          id="register-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder={messages.emailPlaceholder}
          aria-invalid={state.fieldErrors.email ? true : undefined}
          aria-describedby={state.fieldErrors.email ? 'register-email-error' : undefined}
        />
        {state.fieldErrors.email ? <span id="register-email-error" className="form-field__error">{state.fieldErrors.email}</span> : null}
      </label>

      <div className="form-grid form-grid--two">
        <label className="form-field">
          <span>{messages.password}</span>
          <PasswordInput
            id="register-password"
            name="password"
            autoComplete="new-password"
            placeholder={messages.newPasswordPlaceholder}
            ariaInvalid={Boolean(state.fieldErrors.password)}
            ariaDescribedby={state.fieldErrors.password ? 'register-password-error' : undefined}
            showLabel={messages.showPassword}
            hideLabel={messages.hidePassword}
          />
          {state.fieldErrors.password ? <span id="register-password-error" className="form-field__error">{state.fieldErrors.password}</span> : null}
        </label>

        <label className="form-field">
          <span>{messages.confirmPassword}</span>
          <PasswordInput
            id="register-confirm-password"
            name="confirmPassword"
            autoComplete="new-password"
            placeholder={messages.confirmPasswordPlaceholder}
            ariaInvalid={Boolean(state.fieldErrors.confirmPassword)}
            ariaDescribedby={state.fieldErrors.confirmPassword ? 'register-confirm-password-error' : undefined}
            showLabel={messages.showPassword}
            hideLabel={messages.hidePassword}
          />
          {state.fieldErrors.confirmPassword ? <span id="register-confirm-password-error" className="form-field__error">{state.fieldErrors.confirmPassword}</span> : null}
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
