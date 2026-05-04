'use client';

import type { ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import { cn } from '../../lib/utils';

type FormSubmitButtonProps = {
  label: string;
  pendingLabel: string;
  className?: string;
  children?: ReactNode;
  disabled?: boolean;
};

export function FormSubmitButton({ label, pendingLabel, className, children, disabled = false }: FormSubmitButtonProps) {
  const { pending } = useFormStatus();
  const isDisabled = pending || disabled;

  return (
    <button
      type="submit"
      className={cn('button button--primary', className)}
      disabled={isDisabled}
      aria-disabled={isDisabled}
    >
      {pending ? pendingLabel : label}
      {children}
    </button>
  );
}
