'use client';

import type { ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import { cn } from '../../lib/utils';

type FormSubmitButtonProps = {
  label: string;
  pendingLabel: string;
  className?: string;
  children?: ReactNode;
};

export function FormSubmitButton({ label, pendingLabel, className, children }: FormSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className={cn('button button--primary', className)}
      disabled={pending}
      aria-disabled={pending}
    >
      {pending ? pendingLabel : label}
      {children}
    </button>
  );
}
