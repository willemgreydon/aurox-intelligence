import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { requireCurrentSession } from '../../server/auth/session';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const auth = await requireCurrentSession('/admin');

  if (auth.user.role !== 'admin') {
    notFound();
  }

  return <>{children}</>;
}
