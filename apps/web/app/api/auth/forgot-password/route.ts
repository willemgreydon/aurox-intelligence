import { forgotPasswordInputSchema } from '@repo/api-contracts';
import { NextResponse } from 'next/server';
import { requestPasswordReset } from '../../../../server/auth/service';

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = forgotPasswordInputSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        message:
          'If an account exists for that email address, password reset instructions will be sent.',
      },
      { status: 200 },
    );
  }

  await requestPasswordReset(parsed.data.email);

  return NextResponse.json({
    message:
      'If an account exists for that email address, password reset instructions will be sent.',
  });
}
