import { NextResponse } from 'next/server';
import { getOptionalCurrentSession } from '../../../../server/auth/session';

export async function GET() {
  const session = await getOptionalCurrentSession();

  if (!session) {
    return NextResponse.json({ user: null, session: null });
  }

  return NextResponse.json(session);
}
