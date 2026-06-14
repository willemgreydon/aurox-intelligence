'use client';

import { useState } from 'react';

type PasswordInputProps = {
  id: string;
  name: string;
  autoComplete?: string;
  placeholder?: string;
  ariaInvalid?: boolean;
  ariaDescribedby?: string;
  /** Localized label announced when the field is masked (action: reveal). */
  showLabel: string;
  /** Localized label announced when the field is revealed (action: hide). */
  hideLabel: string;
};

/**
 * Password field with an accessible show/hide toggle. The eye button is a real
 * <button> with a toggling aria-label and aria-pressed; the icon is decorative
 * (aria-hidden). Keyboard- and screen-reader-operable; >=44px tap target via CSS.
 */
export function PasswordInput({
  id,
  name,
  autoComplete,
  placeholder,
  ariaInvalid,
  ariaDescribedby,
  showLabel,
  hideLabel,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="password-field">
      <input
        id={id}
        name={name}
        type={visible ? 'text' : 'password'}
        autoComplete={autoComplete}
        placeholder={placeholder}
        aria-invalid={ariaInvalid ? true : undefined}
        aria-describedby={ariaDescribedby}
        className="password-field__input"
      />
      <button
        type="button"
        className="password-field__toggle"
        aria-label={visible ? hideLabel : showLabel}
        aria-pressed={visible}
        onClick={() => setVisible((current) => !current)}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {visible ? (
            <>
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
              <path d="M1 1l22 22" />
            </>
          ) : (
            <>
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </>
          )}
        </svg>
      </button>
    </div>
  );
}
