'use client';

import { signOutAction } from '../../server/actions/auth-actions';
import { FormSubmitButton } from './form-submit-button';

type SignOutButtonProps = {
  className?: string;
  compact?: boolean;
  label?: string;
  pendingLabel?: string;
};

export function SignOutButton({
  className,
  compact = false,
  label = 'Sign out',
  pendingLabel = 'Signing out...',
}: SignOutButtonProps) {
  const resolvedClassName = compact ? `button button--secondary ${className ?? ''}`.trim() : className;

  return (
    <form action={signOutAction}>
      <FormSubmitButton
        label={label}
        pendingLabel={pendingLabel}
        {...(resolvedClassName ? { className: resolvedClassName } : {})}
      />
    </form>
  );
}
