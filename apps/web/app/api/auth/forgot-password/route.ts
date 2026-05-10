import { forgotPasswordInputSchema } from '@repo/api-contracts';
import { NextResponse } from 'next/server';
import { requestPasswordReset } from '../../../../server/auth/service';
import { checkRateLimit } from '../../../../server/lib/rate-limit';

export async function POST(request: Request) {
  const limited = await checkRateLimit(request, 'auth:forgot-password', { max: 5, windowMs: 60_000 });
  if (limited) return limited;

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
