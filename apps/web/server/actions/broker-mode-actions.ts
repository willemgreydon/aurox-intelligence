'use server';

import { resetSimulationAccount } from '@repo/db';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireCurrentSession } from '../auth/session';

export async function emergencyStopAction(): Promise<void> {
  const auth = await requireCurrentSession('/invest/overview');

  await resetSimulationAccount(auth.user.id);

  revalidatePath('/invest');
  revalidatePath('/invest/overview');
  revalidatePath('/invest/simulation');
  revalidatePath('/dashboard');

  redirect('/invest/overview');
}

export async function pauseSimulationAction(): Promise<void> {
  await requireCurrentSession('/invest/overview');

  revalidatePath('/invest');
  revalidatePath('/invest/overview');
  revalidatePath('/invest/simulation');

  redirect('/invest/simulation?paused=1');
}
