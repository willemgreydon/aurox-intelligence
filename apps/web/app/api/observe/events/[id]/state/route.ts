import { NextResponse } from 'next/server';
import { requireCurrentSession } from '../../../../../../server/auth/session';
import { updateObservationInteraction } from '../../../../../../server/services/market-observation-service';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await requireCurrentSession('/login');
  const { id } = await context.params;
  const body = await request.json() as { action?: 'read' | 'pin' | 'dismiss'; value?: boolean };
  const action = body.action;

  if (!action) {
    return NextResponse.json({ ok: false, error: 'Missing action' }, { status: 400 });
  }

  await updateObservationInteraction({
    userId: session.user.id,
    eventId: id,
    action,
    value: body.value,
  });

  return NextResponse.json({ ok: true });
}
