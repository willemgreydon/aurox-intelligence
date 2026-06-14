'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { AppMessages } from '../../lib/i18n/messages';

type ForgotPasswordFormProps = {
  messages: AppMessages['auth'];
};

type Status = 'idle' | 'submitting' | 'done';

// Unauthenticated password-reset request. Posts to the existing, rate-limited
// /api/auth/forgot-password endpoint, which always returns a generic message
// (it never reveals whether an account exists).
export function ForgotPasswordForm({ messages }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('submitting');
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = (await response.json().catch(() => null)) as { message?: unknown } | null;
      setResultMessage(
        typeof data?.message === 'string'
          ? data.message
          : 'If an account exists for that email address, password reset instructions will be sent.',
      );
    } catch {
      setResultMessage('Could not submit the request right now. Please try again.');
    } finally {
      setStatus('done');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <div className="auth-form__header">
        <h2>{messages.forgotTitle}</h2>
        <p>{messages.forgotDescription}</p>
      </div>

      {resultMessage ? (
        <div role="alert" aria-live="polite" className="form-banner form-banner--success">
          {resultMessage}
        </div>
      ) : null}

      <label className="form-field">
        <span>{messages.emailAddress}</span>
        <input
          id="forgot-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={messages.emailPlaceholder}
        />
      </label>

      <button type="submit" className="button auth-form__submit" disabled={status === 'submitting'}>
        {status === 'submitting' ? messages.forgotSending : messages.forgotSubmit}
      </button>

      <p className="auth-form__meta">
        <Link href="/login">{messages.backToLogin}</Link>
      </p>
    </form>
  );
}
