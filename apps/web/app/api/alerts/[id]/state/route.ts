import { NextResponse } from 'next/server';
import { requireCurrentSession } from '../../../../../server/auth/session';
import { updateAlertInteraction } from '../../../../../server/services/alert-center-service';
import { revalidateForAlertState } from '../../../../../server/lib/revalidation-targets';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await requireCurrentSession('/login');
  const { id } = await context.params;
  const body = await request.json() as { action?: 'read' | 'pin' | 'snooze' | 'dismiss' | 'resolve' };
  if (!body.action) {
    return NextResponse.json({ ok: false, error: 'Missing action' }, { status: 400 });
  }
  await updateAlertInteraction({
    userId: session.user.id,
    alertId: id,
    action: body.action,
  });
  revalidateForAlertState();
  return NextResponse.json({ ok: true });
}
